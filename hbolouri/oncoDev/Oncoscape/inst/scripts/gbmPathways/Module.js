<script>
//----------------------------------------------------------------------------------------------------
var cwGbm;   // keep this public so that the tabsApp can see it, reset on tab activate

var gbmPathwaysModule = (function () {

  var cyDiv;
  var viewAbstractsButton, zoomSelectedButton;
  var tissueMenu, movieButton;
  var selectLabel;

  var slowerMovieButton, fasterMovieButton;
  var currentMovieSpeed = 750;
  var movieSpeedReadout;
  var movieIntervalID;

  var searchBox;
  var edgeSelectionOn = false;
  var expressionData;   // consists of a gene list, a tissue list, and the data (a list of 
                        // gene/value pairs, each list named by a tissue (patient) id
  var cnvData;
  var mutationData;

  var moviePlaying = false;
  var thisModuleName = "gbmPathways";



  //--------------------------------------------------------------------------------------------
  function initializeUI (network, vizmap) {

      console.log("=== Module.gbm, initializeUI");

      cyDiv = $("#cwGbmPathwaysDiv");

      selectLabel = $("#gbmPathwaysSelectLabel");
      selectLabel.css("color", "lightgray");   // not functional until some tissueIDs have been been added
      viewAbstractsButton = $("#gbmViewAbstractsButton");
      viewAbstractsButton.button();
      viewAbstractsButton.click(toggleEdgeSelection);

      zoomSelectedButton  = $("#gbmZoomSelectedButton");
      zoomSelectedButton.button()
      zoomSelectedButton.click(zoomSelection);

      tissueMenu = $("#gbmPathwaysSampleSelector");
      tissueMenu.change(tissueSelectorChanged);

      movieButton = $("#gbmPathwaysMovieButton");
      movieButton.button();
      movieButton.prop("disabled", true);

      slowerMovieButton = $("#slowerMovieButton");
      slowerMovieButton.button();
      fasterMovieButton = $("#fasterMovieButton");
      fasterMovieButton.button();

      movieSpeedReadout = $("#gbmPathwaysMovieSpeedReadout");
      movieSpeedReadout.text(Number(currentMovieSpeed/1000).toFixed(2));

      fasterMovieButton.click(function() {changeMovieSpeed(-250);})
      slowerMovieButton.click(function() {changeMovieSpeed(250);})

      movieButton.click(togglePlayMovie);
      searchBox = $("#gbmPathwaysSearchBox");
      loadNetwork(network, vizmap);
      $(window).resize(handleWindowResize);
      $("#gbmPathwayAboutLink").click(showAbout_gbmPathway)
    };

   //----------------------------------------------------------------------------------------------------
    function showAbout_gbmPathway(){
  
          var   info ={Modulename: thisModuleName,
                    CreatedBy: "Hamid Boulori,\nPaul Shannon",
                    MaintainedBy: "Hamid Boulori,\nPaul Shannon",
                    Folder: "gbmPathways"}

         about.OpenAboutWindow(info) ;
    }  

  //--------------------------------------------------------------------------------------------
  function loadNetwork (network, vizmap) {

    cwGbm = $("#cwGbmPathwaysDiv");
    cwGbm.cytoscape({
       elements: network,
       style: vizmap,
       showOverlay: false,
       minZoom: 0.01,
       maxZoom: 8.0,
       layout: {
         name: "preset",
         fit: true
         },
     ready: function() {
        console.log("cwGbm ready");
        cwGbm = this;
        cwGbm.elements().qtip({
            content: function() {
              return (this.data().canonicalName);
              },
            position: {
              my: 'top center',
              at: 'bottom center'
              },
            show: {
              delay: 1000,
              event: 'mouseover'
              },
            hide: {
              event: 'mouseout'
              },
            style: {
              classes: 'qtip-bootstrap',
              tip: {
                 width: 16,
                 height: 8
                }
              }
            }); // qtip

        cwGbm.on('select', 'edge', function(evt){
           var edge = evt.cyTarget;
           console.log("selected edge");
           var pmid = edge.data().pmid;
           console.log("pmid: " + pmid);
           openCenteredBrowserWindow("http://www.ncbi.nlm.nih.gov/pubmed/?term=" + pmid, "pubmed abstract", 800, 600)
           });
        searchBox.keydown(doSearch);

        cwGbm.edges().unselectify();
        console.log("cwGbm.reset");
        cwGbm.reset();
        setInfoNodeLabel("neutral");
        handleWindowResize();
        } // cy.ready
       })
    .cytoscapePanzoom({ });   // need to learn about options
    } // loadNetwork

   //----------------------------------------------------------------------------------------------------
   function handleWindowResize () {
      console.log("gbmPathways window resize: " + $(window).width() + ", " + $(window).height());
      cyDiv.width(0.95 * $(window).width());
      cyDiv.height(0.9 * $(window).height());
      cwGbm.resize();
      cwGbm.fit(50);
      } // handleWindowResize


   //----------------------------------------------------------------------------------------------------
   function zoomSelection() {
      cwGbm.fit(cwGbm.$(':selected'), 50)
      }

   //----------------------------------------------------------------------------------------------------
   function toggleEdgeSelection () {
     if(edgeSelectionOn){
        cwGbm.edges().unselectify();
        edgeSelectionOn = false;
        viewAbstractsButton.button("option", "label", "Enable Abstracts");
        }
      else{
        cwGbm.edges().selectify();
        edgeSelectionOn = true;
        viewAbstractsButton.button("option", "label", "Disable Abstracts");
        }
      } // toggleEdgeSelection

   //----------------------------------------------------------------------------------------------------
   function transformMatrixToPatientOrientedNamedList(mtx) {

        // geneNames are repeated in each element; grab them from the first one
      var geneNames = Object.keys(mtx[0]);
        // the last element was originally (in R) the row name -- the tissue
        // gene1: expression, gene2: expession, ... rowname: 0445.T.1
      geneCount = geneNames.length - 1;
      geneNames = geneNames.slice(0,geneCount);
      var tissueNames = [];
      max = mtx.length;
      namedList={};

      for(var r=0; r < max; r++){
         row = mtx[r]
         tissueName = row["rowname"][0];
         tissueNames.push(tissueName);
         namedList[tissueName] = row;
         } // for r

      result = {genes: geneNames, tissues: tissueNames, values: namedList};
      return(result);

      } // transformMatrixToPatientOrientedNamedList

   //----------------------------------------------------------------------------------------------------
     // initially, a random set of patient, tissue of sample ids.  soon set by humans
     // these five are those from   fivenum(matrix[, "KDR"])
     //   TCGA.02.0058  TCGA.06.0132  TCGA.02.0034  TCGA.12.0657  TCGA.06.0155 
     //    -3.10414205   -0.62431669    0.05214659    0.60673149    4.43374413 
   function demoTissues() {

        // good for copy number and expression changes, but no mutations
      patients = ["TCGA.02.0058", "TCGA.06.0132", "TCGA.02.0034", "TCGA.12.0657", "TCGA.06.0155",
                  "TCGA.06.0155", "TCGA.06.0162", "TCGA.06.1087", "TCGA.12.0778", 
                  "TCGA.14.0871", "TCGA.06.0192"];

        // has about a dozen mutations, much richer than average, with good cn and expression variation too
      patients = ["neutral", "TCGA.06.0125", "TCGA.06.0126", "TCGA.06.0128", "TCGA.06.0130", "TCGA.06.0184",
                  "TCGA.06.0188", "TCGA.06.0221", "TCGA.06.0882", "TCGA.12.0692", "TCGA.76.6282",
                  "TCGA.81.5910"]

      return(patients);
      }

   //----------------------------------------------------------------------------------------------------
     // run all that should happen when this module receives an incoming selection of patientIDs
   demoGBMIncomingSelectionOfPatientIDs = function() {
      request_mRNA_data(demoTissues(), geneSymbols());   // entities: patient, tissue or sample ids
      request_cnv_data(demoTissues(), geneSymbols());
      request_mutation_data(demoTissues(), geneSymbols());
      } // demoIncomingSelectionOfPatientIDs

   //----------------------------------------------------------------------------------------------------
   function handlePatientIDs(msg){

      console.log("=== entering handlePatientIDs for gbm");
      console.log("status: " + msg.status);
   
      tissueIDCount = msg.payload.count;
      tissueIDs = msg.payload.ids;
 
        // solve the R/javascript difference about vectors of length 1 vs a single scalar
      if (tissueIDCount == 1){ tissueIDs = [tissueIDs];    }
      
      request_mRNA_data(tissueIDs, geneSymbols());   // entities: patient, tissue or sample ids
      request_cnv_data(tissueIDs, geneSymbols());
      request_mutation_data(tissueIDs, geneSymbols());
      } // handlePatientIDs

   //----------------------------------------------------------------------------------------------------
   function nodeIDs(){
     nodes = cwGbm.filter("node:visible");
     result = [];
     for(var i=0; i < nodes.length; i++){
       id = nodes[i].data()['id'];
       result.push(id);
       } // for i
     return(result)
     } // nodeIDs

   //----------------------------------------------------------------------------------------------------
   function nodeNames() {

     nodes = cwGbm.filter("node:visible");
     result = [];
     for(var i=0; i < nodes.length; i++){
       result.push(nodes[i].data().label)
       } // for i
     return(result)
     } // nodeNames

   //----------------------------------------------------------------------------------------------------
   function geneSymbols() {

     nodes = cwGbm.filter("node");
     result = [];
     for(var i=0; i < nodes.length; i++){
       sym = nodes[i].data().geneSymbol
       if(typeof(sym) != "undefined")
          result.push(sym)
       } // for i
     return(result)
     } // geneSymbols

   //----------------------------------------------------------------------------------------------------
   function changeMovieSpeed(delta) {

      if((currentMovieSpeed + delta) < 0)
         return;

      console.log("currentMovieSpeed: " + currentMovieSpeed);
      currentMovieSpeed += delta;
      console.log("currentMovieSpeed: " + currentMovieSpeed);
      movieSpeedReadout.text(Number(currentMovieSpeed/1000).toFixed(2));
      if(moviePlaying){
         clearInterval(movieIntervalID);
         movieIntervalID = setInterval(oneFrame, currentMovieSpeed);
         }
      } // changeMovieSpeed

   //----------------------------------------------------------------------------------------------------
   function togglePlayMovie() {

      allCurrentTissues = tissueMenu.children().map(function() {return $(this).val();}).get();
      currentTissueIndex = 0;

     oneFrame = function(){
        tissueIndex = currentTissueIndex  % allCurrentTissues.length;
        tissueName =  allCurrentTissues[tissueIndex]
        //console.log(" movie about to display frame " + tissueIndex + ", " + tissueName);
        currentTissueIndex = currentTissueIndex + 1;
        tissueMenu.val(tissueName);
        tissueSelectorChanged()
        } // oneFrame

     if(moviePlaying){
        moviePlaying = false;
        clearInterval(movieIntervalID);
        movieButton.button( "option", "label", "Movie");
        }
     else{
        moviePlaying = true;
        movieButton.button( "option", "label", "Stop ");
        movieIntervalID = setInterval(oneFrame, currentMovieSpeed);
        }
   

    } // togglePlayMovie
   //----------------------------------------------------------------------------------------------------
   function doSearch(e) {

      var keyCode = e.keyCode || e.which;

      if (keyCode == 13) {
         searchString = searchBox.val();
         console.log("searchString: " + searchString);
         names = nodeNames()
         matches = []
         for(var i=0; i < names.length; i++){
            if(names[i].beginsWith(searchString)) {
               console.log(searchString + " matched " + names[i]);
               s = "cwGbm.filter('node[label=\"" + names[i] + "\"]').select()";
               console.log("select cmd: " + s);
               JAVASCRIPT_EVAL (s);
               } // if searchString matched beginning of node
            } // for i
         } // if 13 (return key)

      } // doSearch
    //----------------------------------------------------------------------------------------------------
    function request_mRNA_data(entities, features) {

      msg = {cmd:"get_mRNA_data",
              callback: "handle_gbmPathways_mRNA_data",
              status:"request",
              payload:{entities: entities, features: features}
              };
       msg.json = JSON.stringify(msg);
       socket.send(msg.json);
       }

    //----------------------------------------------------------------------------------------------------
    function request_cnv_data(entities, features) {

      msg = {cmd:"get_cnv_data",
              callback: "handle_gbmPathways_cnv_data",
              status:"request",
              payload:{entities: entities, features: features}
              };
       msg.json = JSON.stringify(msg);
       socket.send(msg.json);
       }

    //----------------------------------------------------------------------------------------------------
    function request_mutation_data(entities, features) {

      msg = {cmd:"get_mutation_data",
              callback: "handle_gbmPathways_mutation_data",
              status:"request",
              payload:{entities: entities, features: features}
              };
       msg.json = JSON.stringify(msg);
       socket.send(msg.json);
       }

    //----------------------------------------------------------------------------------------------------
    function addTissueIDsToSelector (tissueIDs) {
      tissueMenu.empty();
      if(tissueIDs.length == 0) {
         alert("gbmPathways received empty tissueIDs list")
         return;
         }
      
      // every set of tissueIDs needs a neutral (no data) pseudo-tissue

      tissueIDs.unshift("neutral");

      for(var i=0; i < tissueIDs.length; i++){
         tissueName = tissueIDs[i]
         optionMarkup = "<option>" + tissueName + "</option>";
         tissueMenu.append(optionMarkup);
         } // for i

     } // addTissueIDsToSelector
    //----------------------------------------------------------------------------------------------------
    function handle_mRNA_data(msg) {

       console.log("handling mRNA data");
       var mtx = JSON.parse(msg.payload.mtx);
       expressionData = transformMatrixToPatientOrientedNamedList(mtx);
       addTissueIDsToSelector(expressionData.tissues);
       movieButton.prop("disabled", false);
       selectLabel.css("color", "black");
       raiseTab("gbmPathwaysDiv");
       } // handle_mRNA_data

    //----------------------------------------------------------------------------------------------------
    function handle_cnv_data(msg) {

       console.log("handling cnv data");
       var mtx = JSON.parse(msg.payload.mtx);
       cnvData = transformMatrixToPatientOrientedNamedList(mtx);
       } // handle_mRNA_data

    //----------------------------------------------------------------------------------------------------
    function handle_mutation_data(msg) {

       console.log("handling mutation data");
       var mtx = JSON.parse(msg.payload.mtx);
       mutationData = transformMatrixToPatientOrientedNamedList(mtx);
       } // handle_mRNA_data

    //----------------------------------------------------------------------------------------------------
    function tissueSelectorChanged() {

       tissueID = tissueMenu.val()
       displayTissue(tissueID);

       } // tissueSelectorChanged

    //----------------------------------------------------------------------------------------------------
    function setInfoNodeLabel (newLabel){
       infoNodeID = cwGbm.filter('node[canonicalName="info.node"]').data("id")
       noa = {};
       noa[infoNodeID] = {label: newLabel};
       cwGbm.batchData(noa);
       }

    //----------------------------------------------------------------------------------------------------
    function displayTissue(tissueID) {

       setInfoNodeLabel(tissueID);

       var noa = {};

       if(tissueID == "neutral") {
          console.log(" will display neutral values of expression, copynumber, mutation");
          ids = [];
          allNodes = cwGbm.nodes();
          for(i=0; i < allNodes.length; i++){
             node = allNodes[i];
             id = node.data("id");
             if(Object.keys(node.data()).indexOf("geneSymbol") >= 0){
                geneSymbol = node.data("geneSymbol");
                ids.push(id);
                noa[id] = {score:0, label: geneSymbol, copyNumber:0}
                } // if node has geneSymbol attribute
             } // for i
          cwGbm.batchData(noa);
          return;
          } // neutral pseudo-tissue

       if(expressionData.tissues.indexOf(tissueID) < 0){
          alert(tissueId + " not found in current expressionData");
          return;
          }

       mRNA = expressionData.values
       genes = expressionData.genes;
       tissues = expressionData.tissues;

       noa = {};  // new node attributes to assign in the network

       for(var g=0; g < genes.length; g++){
          gene = genes[g];

          newScore = mRNA[tissueID][gene][0];
          filterString = '[geneSymbol="' + gene + '"]'
          nodeID = cwGbm.nodes(filterString)[0].data("id");
          noa[nodeID] = {score: newScore};
          } // for g

       cwGbm.batchData(noa);

       cnv = cnvData.values
       genes = cnvData.genes;
       tissues = cnvData.tissues;

       noa = {};  // new node attributes to assign in the network

       for(var g=0; g < genes.length; g++){
         gene = genes[g];
         newCopyNumber = cnv[tissueID][gene][0];
         filterString = '[geneSymbol="' + gene + '"]'
         nodeID = cwGbm.nodes(filterString)[0].data("id");
         noa[nodeID] = {copyNumber: newCopyNumber};
         } // for g

       cwGbm.batchData(noa);

       mut = mutationData.values

       noa = {};  // new node attributes to assign in the network
 

       for(var g=0; g < genes.length; g++){
         gene = genes[g];
         newMutation = mut [tissueID][gene][0];
            // identify the node (by id) whose geneSymbol attribute is gene
            // the label attribute changes, but geneSymbol remains
         filterString = 'node[geneSymbol="' + gene  + '"]';
         nodeID = cwGbm.filter(filterString).id();
            // set label and nodeType for every gene
         if(newMutation == null){
            newGeneLabel = gene;
            newNodeType = "gene";
            }
         else{
            newGeneLabel = gene + " (" + newMutation + ")";
            newNodeType = "mutation";
            }
         noa[nodeID] = {label: newGeneLabel, nodeType: newNodeType};
         } // for g, mutations
       cwGbm.batchData(noa);
       } // displayTissue

    //----------------------------------------------------------------------------------------------------
    function SetModifiedDate(){

        msg = {cmd:"getModuleModificationDate",
               callback: "DisplayGbmPathwaysModifiedDate",
               status:"request",
               payload:"gbmPathways"
               };
        msg.json = JSON.stringify(msg);
        socket.send(msg.json);
        }
    //----------------------------------------------------------------------------------------------------
    function DisplayGbmPathwaysModifiedDate(msg){
       document.getElementById("gbmPathwaysDateModified").innerHTML = msg.payload;
       }

   //----------------------------------------------------------------------------------------------------
   return{
     init: function(){
       addSelectionDestination("gbmPathways", "gbmPathwaysDiv");
       onReadyFunctions.push(function() {
          initializeUI(network.elements, vizmap[0].style);
          })

       addJavascriptMessageHandler("DisplayGbmPathwaysModifiedDate", DisplayGbmPathwaysModifiedDate);
       addJavascriptMessageHandler("handle_gbmPathways_mRNA_data", handle_mRNA_data);
       addJavascriptMessageHandler("handle_gbmPathways_cnv_data",  handle_cnv_data);
       addJavascriptMessageHandler("handle_gbmPathways_mutation_data",  handle_mutation_data);
       addJavascriptMessageHandler("gbmPathwaysHandlePatientIDs", handlePatientIDs);

       } // init
     }; 

   }); // gbmPathwaysModule
//----------------------------------------------------------------------------------------------------
gbmPathway = gbmPathwaysModule()
gbmPathway.init();

</script>
