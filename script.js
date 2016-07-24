

d3.queue()
  .defer(d3.json, 'data/fam-w-children-tanf-ratio.json')
  .defer(d3.json, 'data/state_tanf_to_poverty_ratio.json')
  .defer(d3.json, 'data/us-states.json')
  .awaitAll(function (error, results) {
    if (error) { throw error; }
    
    scatter = new DirectedScatterPlot(results[0]);
    scatter.update(results[0]);

    map = new Choropleth(results[1],results[2]);

    d3.select('#restart').on('click', function () {

        scatter.update(results[0]);

    });
  });


var margin = {
	left: 75,
	right: 50,
	top: 50,
	bottom: 75
};


var width = 625 - margin.left - margin.right;
var height = 625 - margin.top - margin.bottom;


function DirectedScatterPlot(data) {
    
    var chart = this;

    chart.SVG = d3.select("#chart1")
    	.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

    chart.svg = d3.select("svg")
    	.append("g")
    	.attr("transform", function(){ return "translate(" + margin.left + "," + margin.top + ")" });

    chart.xScale = d3.scaleLinear()
      	.domain([4500000,7500000])
    	.range([0, width])
    	.nice();

    chart.yScale = d3.scaleLinear()
      	.domain([1500000, 4500000])
    	.range([height, 0]);

    chart.xAxis = d3.axisBottom(chart.xScale).ticks(5, "s");
	chart.yAxis = d3.axisLeft(chart.yScale).ticks(5, "s");

};

DirectedScatterPlot.prototype.update = function (data) {

    var chart = this;
    var full = data.slice();

    chart.svg.selectAll(".circ").remove();
    chart.svg.selectAll(".year_note").remove();
    chart.svg.selectAll(".line").remove();

    // Remove existing map on reset:
    d3.select("#chart2").selectAll("path").remove();

    // Interrupt ongoing transitions:
    chart.svg.selectAll("*").interrupt();


    chart.svg.append("g")
        .attr("transform", function(){ return "translate(0," + height + ")" })
        .attr("class", "axis")
        .call(chart.xAxis);

    chart.svg.append("g")
        .attr("class", "axis")
        .call(chart.yAxis);

    chart.svg
        .append("text")
        .attr("class", "yAxisLabel")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", -(margin.left * 0.75))
        .style("text-anchor", "middle")
        .html("Families with Children on TANF");

    chart.svg
        .append("text")
        .attr("class", "xAxisLabel")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom * 0.75)
        .style("text-anchor", "middle")
        .html("Impoverished Families with Children");

    chart.svg.selectAll(".circ")
    	.data(full, function(d){ return d.year }).enter()
    	.append("circle")
    	.attr("class", "circ")
    	.attr("cx", function(d){ return chart.xScale(d.fam_child_pov) })
    	.attr("cy", function(d){ return chart.yScale(d.tanf_fam) })
        .transition()
        .delay(function (d,i){ return (i * 50) })
        .duration(2000)
        .ease(d3.easePoly.exponent(3))
        .attr("r", 8);

    chart.svg.selectAll(".year_note")
        .data(full).enter()
        .append("text")
        .attr("class", "year_note")
        .attr("x", function(d){ return chart.xScale(d.fam_child_pov) })
        .attr("y", function(d){ return chart.yScale(d.tanf_fam) })
        .attr("dx", function(d){ 
            if (d.year <= 2000){ return 10 }
            else if (d.year < 2004) { return 2 }
            else if (d.year < 2006) { return 10 }
            else if (d.year < 2008) { return -40 }
            else if (d.year < 2011) { return 2 }
            else if (d.year < 2013) { return 10 }
            else if (d.year == 2013) { return -40 }
            else if (d.year == 2014) { return 10 }
        })
        .attr("dy", function(d){ 
            if (d.year <= 2000){ return 3 }
            else if (d.year < 2004) { return -10 }
            else if (d.year < 2006) { return 5 }
            else if (d.year < 2008) { return 5 }
            else if (d.year < 2011) { return -10 }
            else if (d.year < 2013) { return 3 }
            else if (d.year == 2013) { return 5 }
            else if (d.year == 2014) { return -3 }
        })
        .text(function(d){ return d.year })
        .attr("opacity",0)
        .transition()
        .delay(function (d,i){ return (i * 50) })
        .duration(2000)
        .ease(d3.easePoly.exponent(3)) 
        // Many more eases here: https://github.com/d3/d3/blob/master/API.md#easings-d3-ease
        .attr("opacity",1);


    // Use d3.line to create a line function that we will use to pass data to our our path's d attribute
    var line = d3.line()
        .x(function(d) { return chart.xScale(d.fam_child_pov); })
        .y(function(d) { return chart.yScale(d.tanf_fam); })
        .curve(d3.curveCatmullRom.alpha(0.7));
        // You can see the other curves here:
        // https://github.com/d3/d3/blob/master/API.md#curves

    // Append a new path to the svg, using .datum() since we are binding all of our data to one new path element. We also pass the line variable to the "d" attribute. 
    chart.svg.append("path")
        .datum(full)
        .attr("class", "line")
        .attr("d", line)
        .style("opacity",0)
        .transition().delay(2000).duration(1000).on("end", function(){ map.update(); })
        .style("opacity", 1);

};	


function Choropleth(change, states){

    var chart = this;

    chart.svg = d3.select("#chart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", function(){ return "translate(" + margin.left + "," + margin.top + ")" });

    // Data merge:
    for (var i = 0; i < change.length; i++) {

        var dataState = change[i].State;
        var value_1995 = change[i].y1995;
        var value_2014 = change[i].y2014;

        // Find the corresponding state inside the GeoJSON
        for (var j = 0; j < states.features.length; j++)  {
            var jsonState = states.features[j].properties.name;

            if (dataState == jsonState) {
            states.features[j].properties.value_1995 = value_1995; 
            states.features[j].properties.value_2014 = value_2014; 

            break;

            };
        };

    chart.states = states;

};


Choropleth.prototype.update = function () {

    var chart = this;

    // Interrupt ongoing transitions:  
    chart.svg.selectAll("*").interrupt();

    chart.colorScale = d3.scaleLinear()
        .domain([0,100])
        .range(["#d73027","#4575b4"]);

    // Create a projection with geoAlbersUSA
    // Many more geographic projections available here:
    // https://github.com/d3/d3/blob/master/API.md#projections

    // First create a map projection and specify some options:
    var projection = d3.geoAlbersUsa()
       .translate([width/2, height/2])// Places the map in the center of the SVG
       .scale([width * 1.5]); // Scales the size of the map

    // Then pass this projection to d3.geoPath() - which is analagous to d3.line()
    var projectionPath = d3.geoPath().projection(projection);

    // Now we have this projection path that we can give to the "d" attribute of a new path:
    chart.map = chart.svg.append("g").attr("transform", "translate(0,30)").selectAll("path")
        .data(chart.states.features)
        .enter()
        .append("path")
        .attr("class", "map")
        .attr("d", projectionPath)
        .attr("stroke", "black")
        .attr("fill", function(d){ 
            return chart.colorScale(d.properties.value_1995);
        })
        .transition().duration(5000)
        .style("fill", function(d){
            return chart.colorScale(d.properties.value_2014);
        })

    };
};








