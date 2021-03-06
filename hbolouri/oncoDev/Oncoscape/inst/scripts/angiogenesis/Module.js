<script>
//----------------------------------------------------------------------------------------------------
var cwAngio;   // keep this public so that the tabsApp can see it, reset on tab activate

var angioPathwaysModule = (function () {

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

  var sendSelectionMenu;
  var myModuleName = "Angiogenesis";
  var myDivName = "angiogenesisDiv";


  //--------------------------------------------------------------------------------------------
  function initializeUI (network, vizmap) {

      console.log("=== Module.angio, initializeUI");

      cyDiv = $("#cwAngiogenesisDiv");

      selectLabel = $("#angiogenesisSelectLabel");
      selectLabel.css("color", "lightgray");   // not functional until some tissueIDs have been been added
      viewAbstractsButton = $("#angioViewAbstractsButton");
      viewAbstractsButton.button();
      viewAbstractsButton.click(toggleEdgeSelection);

      zoomSelectedButton  = $("#angioZoomSelectedButton");
      zoomSelectedButton.button()
      zoomSelectedButton.click(zoomSelection);

      tissueMenu = $("#angiogenesisSampleSelector");
      tissueMenu.change(tissueSelectorChanged);

      movieButton = $("#angiogenesisMovieButton");
      movieButton.button();
      movieButton.prop("disabled", true);

      slowerMovieButton = $("#angioSlowerMovieButton");
      slowerMovieButton.button();
      fasterMovieButton = $("#angioFasterMovieButton");
      fasterMovieButton.button();

      movieSpeedReadout = $("#angiogenesisMovieSpeedReadout");
      movieSpeedReadout.text(Number(currentMovieSpeed/1000).toFixed(2));

      fasterMovieButton.click(function() {changeMovieSpeed(-250);})
      slowerMovieButton.click(function() {changeMovieSpeed(250);})

      movieButton.click(togglePlayMovie);
      searchBox = $("#angiogenesisSearchBox");

      sendSelectionMenu = $("#angioSendSelectionMenu")  // only unique part?
      sendSelectionMenu.change(sendSelection);
      sendSelectionMenu.empty();
       
      sendSelectionMenu.append("<option>Send Selection...</option>")
      var moduleNames = getSelectionDestinations();
      for(var i=0;i< moduleNames.length; i++){
         if(moduleNames[i] != myModuleName){
            var optionMarkup = "<option>" + moduleNames[i] + "</option>";
            sendSelectionMenu.append(optionMarkup);
            } // if
         } // for 

      loadNetwork(network, vizmap);
      $(window).resize(handleWindowResize);
      $("#angiogenesisAboutLink").click(showAbout_angiogenesis)
      };

   //----------------------------------------------------------------------------------------------------
    function showAbout_angiogenesis(){
  
          var   info ={Modulename: "Angiogenesis",
                    CreatedBy: "Paul Shannon",
                    MaintainedBy: "Paul Shannon",
                    Folder: "angiogenesis"}

         about.OpenAboutWindow(info) ;
    }  

  //--------------------------------------------------------------------------------------------
  function loadNetwork (network, vizmap) {

    console.log("loading network, node count: " + network.nodes.length);
    cwAngio = $("#cwAngiogenesisDiv");
    cwAngio.cytoscape({
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
        console.log("cwAngio ready");
        cwAngio = this;
        /**********
        cwAngio.elements().qtip({
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
        **********/

        cwAngio.on('select', 'edge', function(evt){
           var edge = evt.cyTarget;
           console.log("selected edge");
           var pmid = edge.data().pmid;
           console.log("pmid: " + pmid);
           openCenteredBrowserWindow("http://www.ncbi.nlm.nih.gov/pubmed/?term=" + pmid, "pubmed abstract", 800, 600)
           });
        searchBox.keydown(doSearch);

        cwAngio.edges().unselectify();
        console.log("cwAngio.reset");
        cwAngio.reset();
        console.log("Module.angio about to call setInfoNodeLabel from loadNetwork ('neutral')");
        setInfoNodeLabel("neutral");
        handleWindowResize();
        } // cy.ready
       })
    .cytoscapePanzoom({ });   // need to learn about options
    } // loadNetwork

   //----------------------------------------------------------------------------------------------------
   function handleWindowResize () {
      console.log("angioPathways window resize: " + $(window).width() + ", " + $(window).height());
      cyDiv.width(0.95 * $(window).width());
      cyDiv.height(0.82 * $(window).height());
      cwAngio.resize();
      cwAngio.fit(50);
      } // handleWindowResize


   //----------------------------------------------------------------------------------------------------
//   function sendToModuleChanged() {
//      destinationMdoule = sendSelectionMenu.val()
//      broadcastSelection(destinationModule);
//      sendSelectionMenu.val("Send Selection to:")
//      } // sendToModuleChanged

   //----------------------------------------------------------------------------------------------------
   function sendSelection() {
     destinationModule = sendSelectionMenu.val();
     selectedIDs = identifyEntitiesInCurrentSelection();
     metadata = {};
     sendSelectionToModule(destinationModule, selectedIDs, metadata);
     sendSelectionMenu.val("Send Selection...");
     }; // sendSelectionMenuChanged


   //----------------------------------------------------------------------------------------------------
    function identifyEntitiesInCurrentSelection(){
      var names = [];
      var noi = cwAngio.filter('node:selected');   // module global variable cwXXX
      for(var n=0; n < noi.length; n++){
        geneName = noi[n].data("geneSymbol");
        if(geneName != null)
           names.push(geneName);
        }
     return(names);
     } // identifyEntitiesInCurrentSelection


   //----------------------------------------------------------------------------------------------------
   function broadcastSelection(destinationModule) {
      selectedNodes = cwAngio.filter("node:selected");
      if(selectedNodes.length == 0)
          return;
      ids = []
      for(var i=0; i < selectedNodes.length; i++){
         geneSymbol = selectedNodes[i].data("geneSymbol");
         if(typeof(geneSymbol) != "undefined")
            ids.push(geneSymbol);
         } // for i
      metadata = null;
      if(ids.length > 0)
        sendSelectionToModule(destinationModule, ids, metadata);
      } // broadcastSelection

   //----------------------------------------------------------------------------------------------------
   function zoomSelection() {
      cwAngio.fit(cwAngio.$(':selected'), 50)
      }

   //----------------------------------------------------------------------------------------------------
   function toggleEdgeSelection () {
     if(edgeSelectionOn){
        cwAngio.edges().unselectify();
        edgeSelectionOn = false;
        viewAbstractsButton.button("option", "label", "Enable Abstracts");
        }
      else{
        cwAngio.edges().selectify();
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
   demoAngioIncomingSelectionOfPatientIDs = function() {
      request_mRNA_data(demoTissues(), geneSymbols());   // entities: patient, tissue or sample ids
      request_cnv_data(demoTissues(), geneSymbols());
      request_mutation_data(demoTissues(), geneSymbols());
      } // demoIncomingSelectionOfPatientIDs

   //----------------------------------------------------------------------------------------------------
   function handlePatientIDs(msg){

      console.log("=== entering handlePatientIDs for angio");
      console.log("status: " + msg.status);
   
      var incomingIds = msg.payload.ids;
      if(typeof(incomingIds) == "string")
         incomingIds = [incomingIds];

      var ourGeneNames = geneSymbols();
      var recognizedGeneNames = [];

      for(var i=0; i < incomingIds.length; i++){
        if(ourGeneNames.indexOf(incomingIds[i]) >= 0)
           recognizedGeneNames.push(incomingIds[i]);
        } // for i


      if(recognizedGeneNames.length > 0){
         console.log(" incoming ids had some gene names");
         selectNodes(recognizedGeneNames);
         }
      else{ // assumed to be patientIDs, for which molecular data is available
        tissueIDCount = msg.payload.count;
        tissueIDs = msg.payload.ids;
          // solve the R/javascript difference about vectors of length 1 vs a single scalar
        if (tissueIDCount == 1){ tissueIDs = [tissueIDs];    }
      
        request_mRNA_data(tissueIDs, geneSymbols());   // entities: patient, tissue or sample ids
        request_cnv_data(tissueIDs, geneSymbols());
        request_mutation_data(tissueIDs, geneSymbols());
        } // else
      } // handlePatientIDs

   //----------------------------------------------------------------------------------------------------
   function selectNodes(nodeNames) {

     for(var i=0; i < nodeNames.length; i++){
        s = "cwAngio.filter('node[geneSymbol=\"" + nodeNames[i] + "\"]').select()";
        console.log("angio selectNodes: " + s);
        JAVASCRIPT_EVAL (s);
        } // for i

     } // selectNodes

   //----------------------------------------------------------------------------------------------------
   function nodeIDs(){
     nodes = cwAngio.filter("node:visible");
     result = [];
     for(var i=0; i < nodes.length; i++){
       id = nodes[i].data()['id'];
       result.push(id);
       } // for i
     return(result)
     } // nodeIDs

   //----------------------------------------------------------------------------------------------------
   function nodeNames() {

     nodes = cwAngio.filter("node:visible");
     result = [];
     for(var i=0; i < nodes.length; i++){
       result.push(nodes[i].data().label)
       } // for i
     return(result)
     } // nodeNames

   //----------------------------------------------------------------------------------------------------
   function geneSymbols() {

     nodes = cwAngio.filter("node");
     result = [];
     for(var i=0; i < nodes.length; i++){
       sym = nodes[i].data().geneSymbol
       if(typeof(sym) != "undefined")
          result.push(sym)
       } // for i
     console.log("geneSymbols: " + result);
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
   

    } // cwGBMtogglePlayMovie
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
               s = "cwAngio.filter('node[label=\"" + names[i] + "\"]').select()";
               console.log("select cmd: " + s);
               JAVASCRIPT_EVAL (s);
               } // if searchString matched beginning of node
            } // for i
         } // if 13 (return key)

      } // doSearch
    //----------------------------------------------------------------------------------------------------
    function request_mRNA_data(entities, features) {

      msg = {cmd:"get_mRNA_data",
              callback: "handle_angio_mRNA_data",
              status:"request",
              payload:{entities: entities, features: features}
              };
       msg.json = JSON.stringify(msg);
       socket.send(msg.json);
       }

    //----------------------------------------------------------------------------------------------------
    function request_cnv_data(entities, features) {

      msg = {cmd:"get_cnv_data",
              callback: "handle_angio_cnv_data",
              status:"request",
              payload:{entities: entities, features: features}
              };
       msg.json = JSON.stringify(msg);
       socket.send(msg.json);
       }

    //----------------------------------------------------------------------------------------------------
    function request_mutation_data(entities, features) {

      msg = {cmd:"get_mutation_data",
              callback: "handle_angio_mutation_data",
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
         alert("angiogenesis received empty tissueIDs list")
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
       if(msg.status == "success"){
          var mtx = JSON.parse(msg.payload.mtx);
          expressionData = transformMatrixToPatientOrientedNamedList(mtx);
          console.log("=== angio adding tissue ids to selector");
          addTissueIDsToSelector(expressionData.tissues);
          movieButton.prop("disabled", false);
          selectLabel.css("color", "black");
          raiseTab("angiogenesisDiv");
          } // if success
       //else{
       //   raiseTab("angiogenesisDiv");
       //   alert("Warning:  none of your identifiers were found in this tab's data.");
       //   }
       } // handle_mRNA_data

    //----------------------------------------------------------------------------------------------------
    function handle_cnv_data(msg) {

       console.log("handling cnv data");
       if(msg.status == "success"){
          var mtx = JSON.parse(msg.payload.mtx);
          cnvData = transformMatrixToPatientOrientedNamedList(mtx);
          }
       } // handle_cnv_data

    //----------------------------------------------------------------------------------------------------
    function handle_mutation_data(msg) {

       console.log("handling mutation data");
       if(msg.status == "success"){
          var mtx = JSON.parse(msg.payload.mtx);
          mutationData = transformMatrixToPatientOrientedNamedList(mtx);
          }
       } // handle_cnv_data

    //----------------------------------------------------------------------------------------------------
    function tissueSelectorChanged() {

       tissueID = tissueMenu.val()
       displayTissue(tissueID);

       } // tissueSelectorChanged

    //----------------------------------------------------------------------------------------------------
    function setInfoNodeLabel (newLabel){
       //console.log("angio setInfoNodeLabel: " + newLabel);
       infoNodeID = cwAngio.filter('node[canonicalName="info.node"]').data("id")
       noa = {};
       noa[infoNodeID] = {label: newLabel};
       cwAngio.batchData(noa);
       }

    //----------------------------------------------------------------------------------------------------
    function displayTissue(tissueID) {

       console.log("Module.angio about to call setInfoNodeLabel from displayTissue (" + tissueID + ")");
       setInfoNodeLabel(tissueID);

       var noa = {};

       if(tissueID == "neutral") {
          console.log(" will display neutral values of expression, copynumber, mutation");
          ids = [];
          allNodes = cwAngio.nodes();
          for(i=0; i < allNodes.length; i++){
             node = allNodes[i];
             id = node.data("id");
             if(Object.keys(node.data()).indexOf("geneSymbol") >= 0){
                geneSymbol = node.data("geneSymbol");
                ids.push(id);
                noa[id] = {score:0, label: geneSymbol, copyNumber:0}
                } // if node has geneSymbol attribute
             } // for i
          cwAngio.batchData(noa);
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
          nodeID = cwAngio.nodes(filterString)[0].data("id");
          noa[nodeID] = {score: newScore};
          } // for g

       cwAngio.batchData(noa);

       cnv = cnvData.values
       genes = cnvData.genes;
       tissues = cnvData.tissues;

       noa = {};  // new node attributes to assign in the network

       for(var g=0; g < genes.length; g++){
         gene = genes[g];
         newCopyNumber = cnv[tissueID][gene][0];
         filterString = '[geneSymbol="' + gene + '"]'
         nodeID = cwAngio.nodes(filterString)[0].data("id");
         noa[nodeID] = {copyNumber: newCopyNumber};
         } // for g

       cwAngio.batchData(noa);

       mut = mutationData.values

       noa = {};  // new node attributes to assign in the network
 

       for(var g=0; g < genes.length; g++){
         gene = genes[g];
         newMutation = mut [tissueID][gene][0];
            // identify the node (by id) whose geneSymbol attribute is gene
            // the label attribute changes, but geneSymbol remains
         filterString = 'node[geneSymbol="' + gene  + '"]';
         nodeID = cwAngio.filter(filterString).id();
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
       cwAngio.batchData(noa);
       } // displayTissue

   //----------------------------------------------------------------------------------------------------
   return{
     init: function(){
       addSelectionDestination(myModuleName, myDivName);
       onReadyFunctions.push(function() {
          initializeUI(angiogenesisNetwork.elements, angiogenesisVizmap[0].style);
          });

        addJavascriptMessageHandler("handle_angio_mRNA_data", handle_mRNA_data);
       addJavascriptMessageHandler("handle_angio_cnv_data",  handle_cnv_data);
       addJavascriptMessageHandler("handle_angio_mutation_data",  handle_mutation_data);
       addJavascriptMessageHandler("AngiogenesisHandlePatientIDs", handlePatientIDs);
       //if(typeof(window.tabsAppRunning) == "undefined") {
       //   socketConnectedFunctions.push(angiogenesisDemoVizChanges)
       //   }
       } // init
     }; 

   }); // angioPathwaysModule
//----------------------------------------------------------------------------------------------------
angioPathway = angioPathwaysModule()
angioPathway.init();

</script>
