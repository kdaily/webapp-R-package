<script>
define(JAVASCRIPT_FORMAT, format)

//--------------------------------------------------------------------------------------------------
//var AllEvents = ["DOB","Encounter", "Diagnosis", "OR",  "MRI","Radiation", "Chemo","Progression",  "Death"];
//var ShowEvents = AllEvents;

	var margin = {top: 10, right: 15, bottom: 30, left: 20}
	var AlignBy = "None";
	var OrderBy = "None";
	var SidePlotEvent = "None";

	 var   TimeLineSize = {width: (750 - margin.left - margin.right), height: (500 - margin.top - margin.bottom)},
    	SideBarSize = {width: (200 - margin.left - margin.right),  height: (500 - margin.top - margin.bottom)},
	    legendSize = {height: 175, width: TimeLineSize.width},
   		OneDay = 1000 *60 * 60*24,
		color = d3.scale.ordinal().range(["#17becf", "#d62728", "#8c564b","#ff7f0e", "#7f7f7f","#9467bd","#1f77b4","#2ca02c", "#bcbd22"])
		color.domain(["DOB","Encounter", "Diagnosis", "OR",  "MRI","Radiation", "Chemo","Progression",  "Death"]);
	 	PatientHeight = 3;

var Events,EventsByID, FormatDate, EventTypes, ShowEvents;
var dispatch = d3.dispatch("load","LoadOptions", "DisplayPatients");
var InitialLoad=true;
//--------------------------------------------------------------------------------------------------	
handleTissueIDsforTimeLine = function(msg){

   console.log("============= patientTimeLines.handleTissueIDsforTimeLine");
   console.log(msg);
   //debugger;

   tissueIDs = msg.payload.tissueIDs
   tissueIDCount = msg.payload.count

   $("#tabs").tabs( "option", "active", 7);

   msg = {cmd: "getPatientJSONevents", status: "request", payload: JSON.stringify(tissueIDs)};
   msg.json = JSON.stringify(msg);
   console.log(msg.json)
   socket.send(msg.json);

} // handleTissueIDsforTimeLine
//----------------------------------------------------------------------------------------------------
loadPatientDemoData = function(){

   console.log("==== patientTimeLines  get Events from File");
   cmd = "getCaisisPatientHistory";
   status = "request"
   callback = "DisplayPatientTimeLine"
   filename = "BTC_clinicaldata_6-18-14.RData";
   msg = {cmd: cmd, callback: callback, status: "request", payload: filename};
   console.log(msg.json)
   socket.send(JSON.stringify(msg));
   
//    msg = {cmd: "getPatientJSONevents_fromFile", status: "request", payload: "caisis.RData"};
//   msg.json = JSON.stringify(msg);
//    console.log(msg.json)
//    socket.send(msg.json);
//
} // loadPatientDemoData
//--------------------------------------------------------------------------------------------------
DisplayPatientTimeLine = function(msg) {
    console.log("==== DisplayPatientTimeLine  code.js document.ready");
   console.log(msg);

//	Events = null, EventTypes = null, EventsByID = null;

    console.log("==== DisplayPatientTimeLine  Events");	
	Events = msg.payload;
	console.log("Event count: " + Events.length);

	//var RemoveIDs = ["P7", "P253", "P134", "P91", "P225", "P41"]
	//	Events = Events.filter(function(d){ 
	//		return RemoveIDs.indexOf(d.PatientID) === -1})

	parseDate = d3.time.JAVASCRIPT_FORMAT ("%m/%d/%Y").parse;
	FormatDate = d3.time.JAVASCRIPT_FORMAT ("%x");
	
  	Events.forEach(function(d) {
        console.log("  d: ", d)
     	d.Keep=true;
     	if(d.date instanceof Array){
			for(var i=0;i<d.date.length;i++){ 
				if(parseDate(d.date[i])===null || !isValidDate(d.date[i])){ 
					console.log("Flag "+ d.date[i]); d.Keep = false;
				}else{  d.date[i] = parseDate(d.date[i]); }
     	}}else{
     		if(parseDate(d.date)===null || !isValidDate(d.date)){ console.log("Flag "+ d.date); d.Keep=false;
	     	} else{d.date = parseDate(d.date); }
     	}
    	d.showPatient = true;
    	d.disabled = false;
    	d.offset = 0    });
	
		console.log("Remove Invalid Dates")
		Events = Events.filter(function(d) {if(!d.Keep){ console.log(d.date)}
			return d.Keep })


 	EventsByID = d3.nest()
	    .key(function(d) { return d.PatientID; })
		.key(function(d) { return d.Name; })
    	.map(Events, d3.map);
 
	EventTypes = d3.map()
	Events.forEach(function(d){
		if(EventTypes.has(d.Name)){
			if(EventTypes.get(d.Name).indexOf(d.Type) === -1){
				EventTypes.get(d.Name).push(d.Type) 		 }
		} else {
			EventTypes.set(d.Name, [d.Type])
		}
	});			
	
	ShowEvents = EventTypes.keys();

	//console.log(Events)
	//console.log(EventsByID)
	//console.log(EventTypes)
	//console.log(EventTypes.keys())

	if(InitialLoad){
		dispatch.LoadOptions();
		InitialLoad=false;
	}
	dispatch.DisplayPatients();


}

//--------------------------------------------------------------------------------------------------
dispatch.on("LoadOptions.AllDisplays", function(){

	console.log("======== load.AllDisplays")

	var svg = d3.select("#DisplayDataDiv").append("svg")
	    	.attr("width", TimeLineSize.width + SideBarSize.width + 2*margin.left + 2*margin.right )
		    .attr("height", SideBarSize.height + margin.top + margin.bottom + legendSize.height)
   			;

	var SidePlot = svg.append("g").attr("class", "SidePlotSVG")
	   		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");	
   		
		console.log("======== TimeLineDisplay")
	var TimeLine = svg.append("g").attr("class", "TimeLineSVG")
   			.attr("transform", "translate(" + (SideBarSize.width+2*margin.left) + "," + margin.top + ")");
	

	console.log("======== PrepOptions.TimeLineDisplay")
		
		var TextOffSet = d3.scale.ordinal()
			.range([0, 70, 82, 85, 75, 72, 75, 75, 80])
			.domain(["DOB","Encounter", "Diagnosis", "OR",  "MRI","Radiation", "Chemo","Progression",  "Death"]);

		//--------------------------------------------------------------------------------------------------
	var legend = svg
 				.append("g")
    			.attr("class", "legend")
    			.attr("transform", "translate(" + (SideBarSize.width+2* margin.left) + "," + (TimeLineSize.height+ margin.top + margin.bottom) + ")")
				.selectAll(".legend")
 				.data(color.domain().filter(function(d){
 					console.log(d); return EventTypes.keys().indexOf(d) !== -1 })  )
	 	   .enter().append("g")
    	   .attr("transform", function(d, i) { 
	    	  	 return "translate(" + i*TextOffSet(d) + ",0)" })
	//			xOff = (i % 5) * 130
	//        	yOff = Math.floor(i  / 5) * 20
	//      	 return "translate(" + xOff + "," + yOff + ")" })
     	 ;

	  	legend.append("rect")
    	  .attr("width", 10)
	      .attr("height", 10)
    	  .style("fill", function(d) { return color(d)})
	      .on("click", click);

	  	legend.append("text")
		  .attr("y", 9)
		  .attr("x", 12)
		  .style("font-size", 12)
    	  .text(function(d) { return d; });


	//--------------------------------------------------------------------------------------------------
	dispatch.on("DisplayPatients.SidePlotDisplay",  function(){

		console.log("======== DisplayPatients.SidePlotDisplay")
		
		SidePlot.selectAll("g").remove();

		var y = d3.scale.linear().range([SideBarSize.height, 0]), 
			yAxis = d3.svg.axis().scale(y).orient("left").ticks(0),		
			x = d3.scale.linear().range([0, SideBarSize.width]),
			xAxis = d3.svg.axis().scale(x).orient("bottom")
	 		y.domain(d3.extent(Events, function(d) { return PatientHeight*d.PtNum; }));
						
		var PatientOrderBy = []
		var Categories = []

		var getDateDiff = function(Event1, Event2, TimeScale){
			var PatientOrder = []; var TimeScaleValue=1
			if(TimeScale==="Days"){TimeScaleValue=OneDay;}
			else if(TimeScale ==="Months"){TimeScaleValue=OneDay*30.425}
			else if(TimeScale==="Years"){ TimeScaleValue = OneDay*365.25}
			
			EventsByID.forEach(function(ID, Patient){
			if(Patient.has(Event1) && Patient.has(Event2) ){
				var dateDiff = (Patient.get(Event2).sort(DescendingDate)[0].date 
							- Patient.get(Event1).sort(DescendingDate)[0].date )/TimeScaleValue
				PatientOrder.push( {ID: ID,info: ~~dateDiff, timeScale: TimeScale, xBar: 0, yBar: Patient.get(Event1)[0].PtNum,  width: ~~dateDiff})
			}
			})
		return PatientOrder;
		}


		if(SidePlotEvent === "None"){	return;	
		} else if(SidePlotEvent === "Survival"){
			PatientOrderBy = getDateDiff("Diagnosis", "Death", "Days")
			xAxis.ticks(3)
		} else if(SidePlotEvent === "AgeDx"){
			PatientOrderBy = getDateDiff("DOB", "Diagnosis", "Years")
			xAxis.ticks(5)
		} else if(SidePlotEvent === "Time to 1st Progression"){
			PatientOrderBy = getDateDiff("Diagnosis","Progression", "Days")
			xAxis.ticks(5)		
		} else if(SidePlotEvent === "1st Progression to Death"){
			PatientOrderBy = getDateDiff("Progression", "Death", "Days")
			xAxis.ticks(5)
		} else if(["Chemo", "Radiation", "Diagnosis", "OR", "Death", "MRI"].indexOf(SidePlotEvent) !== -1){
			//get number of categories
			EventsByID.forEach(function(ID, Patient){
				if(Patient.has(SidePlotEvent)){
					Patient.get(SidePlotEvent).forEach(function(k){
					if(Categories.indexOf(k.Type) == -1){ Categories.push(k.Type)} })
				}
			})
			Categories.sort();
			console.log(Categories)
			console.log(Categories.length)
			var xWidth = 1/Categories.length;
			EventsByID.forEach(function(ID, Patient){
				if(!Patient.has(SidePlotEvent)){
				} else if(Patient.get(SidePlotEvent)[0].showPatient){			
					var xPos = Categories.indexOf(Patient.get(SidePlotEvent)[0].Type)
					PatientOrderBy.push( {ID: ID,info:Patient.get(SidePlotEvent)[0].Type, yBar: Patient.get(SidePlotEvent)[0].PtNum,
									 xBar: xPos * xWidth , width: xWidth})
				}
			})
			xAxis.ticks(Categories.length)
				.tickValues(makeArray(Categories.length,  function(i) { return i/Categories.length; }))
				.tickFormat(function (d) {console.log(Categories[d*Categories.length]); return Categories[d*Categories.length]	})
		} 

		console.log("PatientOrderBy")
		console.log(PatientOrderBy)

 		x.domain([0,d3.max(PatientOrderBy, function(d){ return d.xBar + d.width})]);

	   var tooltip = d3.select("body")
    	  .attr("class", "tooltip")
	      .append("div")
    	  .style("position", "absolute")
	      .style("z-index", "10")
    	  .style("visibility", "hidden")
    	  .text("a simple tooltip");
	
	  	SidePlot.append("g")
    	  .attr("class", "x axis")
	      .attr("transform", "translate(0," + (SideBarSize.height+10) + ")")
    	  .call(xAxis)
	      .selectAll("text")  
		     .style("text-anchor", "end")
		     .style("font-size", 12)
      		 .attr("dy", ".55em")
	      	 .attr("dx", "-.45em")
    	 	 .attr("transform", function(d) {
        		  return "rotate(-75)" 
         		});
 
	  	SidePlot.append("g")
    	  .attr("class", "y axis")
	      .call(yAxis)
    	.append("text")
	      .attr("transform", "rotate(-90)")
    	  .attr("y", 2)
	      .attr("dy", "-.71em")
    	  .style("font-size", 12)
    	  .style("text-anchor", "end")
	      .text(SidePlotEvent);
            
		var BarPlot_Horiz = SidePlot.append("g").selectAll("rect")
			.data(PatientOrderBy)
			.enter()
				.append("rect")
				.attr("x", function(d) { return x(d.xBar);  })
				.attr("y", function(d) { return y(PatientHeight*d.yBar); })
				.attr("width", function(d) { return x(d.width);  })
				.attr("height", function(d) { return PatientHeight; })
				.attr("fill", function(d){ 
					var ColorShade =  d3.rgb(color(SidePlotEvent)); //d3.rgb("grey"); //
					if(Categories.length>0){ 
						return ColorShade.brighter((Categories.indexOf(d.info) % 5)/2) };
					return ColorShade;
					})
				.on("mouseover", function(d,i){
    	    	   tooltip.text(d.ID + ": " + d.info);
	           return tooltip.style("visibility", "visible");
    	       })
		      	.on("mousemove", function(){return tooltip.style("top",
        		  (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");})
		      	.on("mouseout", function(){return tooltip.style("visibility", "hidden");})
				;
	})

	
	//--------------------------------------------------------------------------------------------------
	dispatch.on("DisplayPatients.TimeLineDisplay",  function(){

		console.log("======== DisplayPatients.TimeLineDisplay")
		TimeLine.selectAll("g").remove();

		 var tooltip = d3.select("body")
    	  .attr("class", "tooltip")
	      .append("div")
    	  .style("position", "absolute")
	      .style("z-index", "10")
    	  .style("visibility", "hidden")
	      .text("a simple tooltip");

		var EventOffset = d3.map({"Radiation": 1.5, "Chemo": -1.5})
		var x,TimeScale, xTitle, xAxis, 
				y = d3.scale.linear().range([TimeLineSize.height, 0]), 
				yAxis = d3.svg.axis().scale(y).orient("left").ticks(0)
				;
		var LogTime = function(t){
			 if(AlignBy === "None"){ 
		 			return t;
		 	} else{ var Dir = (t<0 ? -1 : 1); 
				return Dir * Math.log(Math.abs(t)+1)/Math.log(2) 
			}
		}	


			
			if(OrderBy !== "None"){ OrderEvents();}
			if(AlignBy === "None"){ 
				 x = d3.time.scale().range([0, TimeLineSize.width]); TimeScale =1;
				 Xtitle="Year";
				 xAxis = d3.svg.axis().scale(x).orient("bottom")
			} else{
				AlignEvents();
				 x =  d3.scale.linear().range([0, TimeLineSize.width])
				 TimeScale = OneDay
				 Xtitle = "Days"
				 xAxis = d3.svg.axis().scale(x).orient("bottom")
					.ticks(10)
					.tickFormat(function (d) { 
						var Dir = (d<0 ? -1 : 1); 
						return Math.round(Dir * (Math.pow(2, (Math.abs(d)))-1) *100)/100})
				}

		var EventMin	 = d3.min(Events.filter(function(d){ return d.showPatient && !d.disabled}), function(d){ 
							var date = (d.date instanceof Array ? d.date.sort(DescendingDate)[0] : d.date);  return LogTime((date - d.offset)/TimeScale);})
		var EventMax	 = d3.max(Events.filter(function(d){ return d.showPatient && !d.disabled}), function(d){ 
							var date = (d.date instanceof Array ? d.date.sort(DescendingDate)[d.date.length-1] : d.date);  return LogTime((date - d.offset)/TimeScale);})
	
		console.log("Min: " + EventMin + ", Max: "+ EventMax)
		x.domain([EventMin, EventMax]);
		y.domain([d3.min(Events,function(d) { return d.PtNum; }),d3.max(Events,function(d) { return PatientHeight*d.PtNum; })]);

	//	TimeLine.selectAll("g").transition().duration(5000);

	  TimeLine.append("g")
    	  .attr("class", "x axis")
	      .attr("transform", "translate(0," + TimeLineSize.height + ")")
    	  .call(xAxis)
	     .append("text")
	     .style("font-size", 12)
    	  .text(Xtitle);
 
	  TimeLine.append("g")
    	  .attr("class", "y axis")
	      .call(yAxis)
	    .append("text")
    	  .attr("transform", "rotate(-90)")
	      .attr("y", 2)
    	  .attr("dy", ".71em")
	      .style("text-anchor", "end")
	      .style("font-size", 12)
    	  .text("Patients");
      
		var TimeSeries = TimeLine.append("g").selectAll("path")
			.data(Events.filter(function(d){ return (d.date instanceof Array) && !d.disabled && d.showPatient}))
			;
console.log("TimeSeries")
console.log(TimeSeries)

		TimeSeries.enter()
			.append("line")
			.attr("class", "path")
			.attr("x1", function(d) { return x(LogTime((d.date[0] - d.offset)/TimeScale));  })
			.attr("y1", function(d) { return y(PatientHeight*d.PtNum + EventOffset.get(d.Name)); })
			.attr("x2", function(d) { return x(LogTime((d.date[1] - d.offset)/TimeScale));  })
			.attr("y2", function(d) { return y(PatientHeight*d.PtNum+ EventOffset.get(d.Name)); })
			.attr("stroke", function(d){ 
				var ColorShade = d3.rgb(color(d.Name)); 
				if(d3.keys(d).indexOf("Type") !== -1){ 
					return ColorShade.brighter((EventTypes.get(d.Name).indexOf(d.Type) % 5)/2) };
				return ColorShade;
				})
			.attr("stroke-width", PatientHeight*0.75)
			.attr("data-legend",function(d) { return d.Name})
			.on("mouseover", function(d,i){
				var Type = ""; if(d3.keys(d).indexOf("Type") !== -1){ Type = d.Type}
	           tooltip.text(d.PatientID + ": " + d.Name + " (" + FormatDate(d.date[0]) + ", "+ FormatDate(d.date[1]) + ") " + Type);
    	       return tooltip.style("visibility", "visible");
        	   })
	      	.on("mousemove", function(){return tooltip.style("top",
    	      (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");})
	      	.on("mouseout", function(){return tooltip.style("visibility", "hidden");})
			;

		TimeSeries.exit().remove();

		var TimePoint = TimeLine.append("g").selectAll("circle")
			.data(Events.filter(function(d){ return !(d.date instanceof Array) && !d.disabled && d.showPatient}));

console.log("TimePoint")
console.log(TimePoint)
				
		TimePoint.enter()
			.append("circle")
			.attr("class", "circle")
			.style("fill", function(d){ return color(d.Name) })
			.attr("cx", function(d) {return x(LogTime((d.date -d.offset)/TimeScale)); })
			.attr("cy", function(d) { return y(PatientHeight*d.PtNum); })
			.attr("r", function(d) { return PatientHeight;})
			.attr("data-legend",function(d) { return d.Name})
			.on("mouseover", function(d,i){
				var Type = ""; if(d3.keys(d).indexOf("Type") !== -1){ Type = d.Type}
	            tooltip.text(d.PatientID + ": " + d.Name + " (" + FormatDate(d.date) +") " + Type);
	            return tooltip.style("visibility", "visible");
	           })
	      	.on("mousemove", function(){return tooltip.style("top",
	          (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");})
	      	.on("mouseout", function(){return tooltip.style("visibility", "hidden");})
		;

		TimePoint.exit().remove();				

	})
})

//--------------------------------------------------------------------------------------------------
dispatch.on("load.Menu", function(){

	console.log("======== load.Menu")
  	var  AlignByMenu = d3.select("#AlignByDiv")
    		.attr("transform", "translate(" + (3*margin.left+SideBarSize.width+margin.right) + ",0)")
			.append("g")
 			.append("select")
			.on("change", function() {
				AlignBy = this.value; 
				AlignEvents(); 
				dispatch.DisplayPatients()});
  	;
	AlignByMenu.selectAll("option")
			.data(["None"])
			//d3.merge([["None"],EventTypes.keys()]))
			.enter()
				.append("option")
				.attr("value", function(d){return d})
				.text(function(d) { return d})
      ;

  	var  OrderByMenu = d3.select("#OrderByDiv")
 			.append("g")
    		.attr("transform", "translate(" + (margin.left+SideBarSize.width+margin.left+margin.right) + ",0)")
    		.append("select")
			.on("change", function() {
				OrderBy = this.value; 
				OrderEvents(); 	
				dispatch.DisplayPatients()});
  	;
	OrderByMenu.selectAll("option")
			.data(["+Add"])
			//d3.merge([["+Add", "Survival", "TimeToProgression", "AgeDx"],EventTypes.keys()]))
			.enter()
				.append("option")
				.attr("value", function(d){return d})
				.text(function(d) { return d})
      ;
	var  AddSideBarMenu = d3.select("#AddSideBar")
			.style("display", "inline-block") 
			.style("width", (SideBarSize.width + 2*margin.left + margin.right) +"px" )
			.append("g")
			.append("select")
			.on("change", function() {SidePlotEvent = this.value; 
										dispatch.DisplayPatients(); 
										});
	AddSideBarMenu.selectAll("option")
			.data(["+Add"])
			//"Survival", "AgeDx","Time to 1st Progression","1st Progression to Death", "Radiation", "Chemo", "Diagnosis", "OR", "MRI", "Death"])
			.enter()
				.append("option")
				.attr("value", function(d){return d})
				.text(function(d) { return d})
      ;
 	var  SaveImage = d3.select("#SaveImageDiv")
			.on("click", function() {
				console.log("========Save Image: ")
		
				var html = d3.select("svg")
       						 .attr("version", 1.1)
        					 .attr("xmlns", "http://www.w3.org/2000/svg")
       						 .node().parentNode.innerHTML;
			    var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);
				var img = '<img src="'+imgsrc+'">';
//				d3.select("#SVGurl").html(img);
				
				var canvas = document.querySelector("canvas"),
    				context = canvas.getContext("2d");

				var image = new Image;
				image.src = imgsrc;
				image.onload = function() {
 				 	context.drawImage(image, 0, 0);
		
				var canvasdata = canvas.toDataURL("image/png");
				var pngimg = '<img src="'+canvasdata+'">'; 
//  	  					d3.select("#PNGurl").html(pngimg);

 				 	var a = document.createElement("a");
						a.download = "test.png"
 //					 a.download = "Timeline_Align_" +AlignBy + "_OrderBy_" + OrderBy +".png";
 					 a.href = canvasdata;
  					a.click();
				}
			})



	//--------------------------------------------------------------------------------------------------
	dispatch.on("LoadOptions.Menu",  function(){
	
		console.log("======== DisplayPatients.Menu")
   		var CalculatedEvents = {	Survival: {Event1: "Diagnosis", Event2: "Status", TimeScale: "Months"},
   									TimeToProgression: {Event1: "Diagnosis", Event2: "Progression", TimeScale: "Days"},
							   		AgeDx: {Event1: "DOB", Event2: "Diagnosis", TimeScale: "Years"} }
    
      OrderByMenu.selectAll("option")
			.data(d3.merge([["Survival", "TimeToProgression", "AgeDx"],EventTypes.keys()]))
			.enter()
				.append("option")
				.attr("value", function(d){return d})
				.text(function(d) { return d})
      	;
  
  		AlignByMenu.selectAll("option")
			.data(EventTypes.keys())
			.enter()
				.append("option")
				.attr("value", function(d){return d})
				.text(function(d) { return d})
      ;
      
      AddSideBarMenu.selectAll("option")
			.data(["Survival", "AgeDx","Time to 1st Progression","1st Progression to Death", "Radiation", "Chemo", "Diagnosis", "OR", "MRI", "Death"])
			.enter()
				.append("option")
				.attr("value", function(d){return d})
				.text(function(d) { return d})
      ;


	})

})


//--------------------------------------------------------------------------------------------------
AlignEvents = function(){
	
	console.log("========Align Event: "+ AlignBy);
	Events.forEach(function(d){ d.offset = 0; d.showPatient=true;})
	EventsByID.forEach(function(ID, Patient){
				Patient.forEach(function(id, event){event.showPatient = true; event.offset=0;})})

	if (AlignBy === "AgeDx"){ 
	} else if(EventTypes.keys().indexOf(AlignBy) !== -1){
		EventsByID.forEach(function(ID, Patient){
			if( Patient.has(AlignBy)){
				var MinPatientAlignBy = d3.min(Patient.get(AlignBy), function(d) {var date = (d.date instanceof Array ? d3.min(d.date) : d.date);  return date})
				console.log(MinPatientAlignBy)
				Events.filter(function(d){return d.PatientID === ID})
						.forEach(function(d){ d.offset = MinPatientAlignBy;})
			}
			else{		// hide Patients that can't be aligned
				Events.filter(function(d){return d.PatientID === ID})
						.forEach(function(d){ d.showPatient = false; d.offset=0;})
				Patient.forEach(function(id, event){event.showPatient = false; event.offset=0;})
			}
		})
	}

}	

//--------------------------------------------------------------------------------------------------
OrderEvents = function(){
	
	console.log("========Order Event: "+ OrderBy);
	
	var PatientOrderBy = []

	var getDateDiff = function(Event1, Event2, TimeScale){
			var PatientOrder = []; var TimeScaleValue=1
			if(TimeScale==="Days"){TimeScaleValue=OneDay;}
			else if(TimeScale ==="Months"){TimeScaleValue=OneDay*30.425}
			else if(TimeScale==="Years"){ TimeScaleValue = OneDay*365.25}
			
			EventsByID.forEach(function(ID, Patient){
				var dateDiff=0;
				if(Patient.has(Event1) && Patient.has(Event2)){
					dateDiff = (Patient.get(Event2).sort(DescendingDate)[0].date 
								- Patient.get(Event1).sort(DescendingDate)[0].date )/TimeScaleValue
				}
				PatientOrder.push( {ID: ID,value: dateDiff})
		})
		return PatientOrder;
	}

	if(OrderBy === "Survival"){  PatientOrderBy = getDateDiff("Diagnosis", "Death", "")
	} else if(OrderBy === "AgeDx"){  PatientOrderBy = getDateDiff("DOB", "Diagnosis", "")
	} else if(OrderBy === "TimeToProgression"){ PatientOrderBy = getDateDiff("Diagnosis", "Progression", "")
	} else if(EventTypes.keys().indexOf(OrderBy) !== -1){
		EventsByID.forEach(function(ID, Patient){
			if( Patient.has(OrderBy)){
				PatientOrderBy.push(d3.min(Patient.get(OrderBy), function(d) 
					{var date = (d.date instanceof Array ? d3.min(d.date) : d.date);   
						return {ID: ID, value: date} }))
			} })
	} 
	
	PatientOrderBy.sort(DescendingValues).forEach(function(Ordered, i){
				Events.filter(function(d){return d.PatientID === Ordered.ID})
						.forEach(function(d){ d.PtNum = i})
				if(EventsByID.has(Ordered.ID)){EventsByID.get(Ordered.ID)
						.forEach(function(d){ d.PtNum = i})}
		})
		
	console.log("Reordered")
	console.log(PatientOrderBy)
}	
//--------------------------------------------------------------------------------------------------
function DescendingDate(a,b) {
  if (a.date > b.date)
     return -1;
  if (a.date < b.date)
    return 1;
  return 0;
}
//--------------------------------------------------------------------------------------------------
function DescendingValues(a,b) {
  if (a.value > b.value)
     return -1;
  if (a.value < b.value)
    return 1;
  return 0;
}
//--------------------------------------------------------------------------------------------------
function makeArray(count, content) {
   var result = [];
   if(typeof(content) == "function") {
      for(var i=0; i<count; i++) {
         result.push(content(i));
      }
   } else {
      for(var i=0; i<count; i++) {
         result.push(content);
      }
   }
   return result;
}
//--------------------------------------------------------------------------------------------------
function isValidDate(text) {
	//eg text = '2/30/2011';

	var comp = text.split('/');
	var m = parseInt(comp[0], 10);
	var d = parseInt(comp[1], 10);
	var y = parseInt(comp[2], 10);
	var date = new Date(y,m-1,d);

	if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d){
		console.log("Invalid Format Month/Day/Year " + text + ": " + m + "/" + d+ "/" + y)
        return false;
	}
		
	// check month and year
	if(y < 1000 || y > 3000 || m == 0 || m > 12){
		console.log("Invalid Month/Year: " + m + "/" + y)
        return false;
	}
    var monthLength = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

    // Adjust Days for leap years
    if(y % 400 == 0 || (y % 100 != 0 && y % 4 == 0))
        monthLength[1] = 29;

    // Check the range of the day
    if( d <= 0 || d > monthLength[m - 1]){
		console.log("Invalid Day/Month: " + d+ "/" + m)    
     	return false;
	}
	
	return true;
}
//--------------------------------------------------------------------------------------------------	
click =  function(d){
    
    var hide = false;
    var newFilters = [];
 
    ShowEvents.forEach(function (f) {
      if (d === f) {  
      	hide = true;
      	console.log("Hiding " + d);
      	Events.forEach(function(D){ 
      		if(D.Name === d) {D.disabled=true}});
      } else { newFilters.push(f);}
    });

     // Hide the shape or show it
	if (hide) {  d3.select(this).style("opacity", 0.2);
    } else {
      d3.select(this).style("opacity", 1);
      newFilters.push(d);
      Events.forEach(function(D){ 
      		if(D.Name === d) {D.disabled=false}});
     }
	ShowEvents = newFilters;
	dispatch.DisplayPatients();
}
//--------------------------------------------------------------------------------------------------
onReadyFunctions.push(function() {
	addJavascriptMessageHandler("tissueIDsForPatientTimeline", handleTissueIDsforTimeLine);
	//addJavascriptMessageHandler("timeLineMatrix", DisplayPatientTimeLine);
	addJavascriptMessageHandler("DisplayPatientTimeLine", DisplayPatientTimeLine);

	if(typeof(window.tabsAppRunning) == "undefined") {
            console.log("no tabsApp, requesting load of demo data");
   	    socketConnectedFunctions.push(loadPatientDemoData);
       }
   
    dispatch.load();

})
//--------------------------------------------------------------------------------------------------
</script>

