'use strict';

var mytilegram;
var brewmap;
var brewextent;
var borders;
var tiles;
var linear;
var beermap;
var abvextent;
var brewscale;
var toptenstates;
function render() {

    var w = 960;
    var h = 560;
    // var stateCodesWithNames = window.stateCodesWithNames;
    // var topojson = window.topojson;
    var d3 = window.d3;
    var _ = window._;
    var data = generateData();

    function generateData() {
        var states = ['DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'AK', 'CA', 'CO', 'AZ', 'AR', 'AL', 'CT'];

        function dataArray() {
            var data = [];
            _.times(states.length, function (n) {
                data.push({
                    code: states[n],
                    value: _.random(1, 98.5)
                });
            });
            return data;
        }

        return dataArray();
    }

    var f = d3.format('.1f');

    var svg = d3.select('svg').attr('width', w).attr('height', h);

    d3.queue()
    .defer(d3.json,'tiles-topo-us.json')
    .defer(d3.csv,"Data/beers [edited].csv")
    .defer(d3.csv,"breweries.csv")
    .await( function (error, tilegram,beers,breweries) {
        tiles = topojson.feature(tilegram, tilegram.objects.tiles);

        var transform = d3.geoTransform({
            point: function point(x, y) {
                return this.stream.point(x, -y);
            }
        });

        var path = d3.geoPath().projection(transform);

        var g = svg.append('g').attr('transform', 'translate(-350,' + (h - 10) + ')');

        // build list of state codes
        var stateCodes = [];
        // build list of state names
        var stateNames = [];
        // build a list of color values
        var colors = [];
        mytilegram = tilegram;
        brewmap = breweries;
        beermap = beers;

        tiles.features.forEach( function (geometry) {
            geometry.brewcount = 0;
            geometry.avgabv = 0;
            geometry.abvcount = 0;

            beermap.forEach(function (y){
            if (brewmap[y.brewery_id].state == geometry.properties.state){
                geometry.avgabv = geometry.avgabv + Number(y.abv);
                geometry.abvcount++;
            }
        });
        geometry.avgabv = geometry.avgabv / geometry.abvcount;

            brewmap.forEach(function (x){
            x.state = x.state.replace(/ /g,'');
            if (geometry.properties.state == x.state){
                geometry.brewcount++;
            }
        });
        toptenstates = tiles.features.slice(0,tiles.features.length);
        toptenstates.sort(function (a,b) {
            return b.brewcount - a.brewcount;
        });
        toptenstates = toptenstates.slice(0,10);

        });


        tilegram.objects.tiles.geometries.forEach(function (geometry) {
            if (stateCodes.indexOf(geometry.properties.state) === -1) {
                stateCodes.push(geometry.properties.state);
                // pass in state names
                stateNames.push(_.find(stateCodesWithNames, { 'code': geometry.properties.state }).state);
                // pass in color values
                colors.push(_.find(data, { 'code': geometry.properties.state }).value);
            }
        });
        brewextent = d3.extent(tiles.features, function (x){
            return x.brewcount;
        })
        abvextent = d3.extent(tiles.features,function (x){
            if (isNaN(x.avgabv)){
                return .05;
            }
            return x.avgabv;
        });
        //['#cc8f00', '#901800']
        linear = d3.scaleLinear().domain(abvextent).range(['#cc8f00', '#901800']);
        brewscale = d3.scaleSqrt().domain(brewextent).range([1,1]);
        var borderscale = d3.scaleLinear().domain(brewextent).range(["black","white"]);

        borders = g.selectAll('.tiles').data(tiles.features).enter().append('path').attr('d', path).attr('viewBox',path).attr('class', 'border')
        .attr('fill', function (d) {
            if (isNaN(d.avgabv)){
                return linear(.05);
            }
            return linear(d.avgabv);
        })
        .attr('stroke', 'white')
        .attr('stroke-width', 4)
        .attr('transform', 
            function (x){
            return 'translate(' + path.centroid(x)[0] + ' ' + path.centroid(x)[1] +')scale(' + brewscale(x.brewcount) + ')' + 'translate(' + -path.centroid(x)[0] + ' ' + -path.centroid(x)[1] + ')';
        });
        // // add some labels
        g.selectAll('.state-label').data(tiles.features).enter().append('text').attr('class', function (d) {
            return 'state-label state-label-' + d.id;
        }).attr('transform', function (d) {
            return 'translate(' + path.centroid(d) + ')';
        }).attr('fill', function (d){
            return borderscale(d.brewcount);
        })
        .text(function (d) {
            return d.properties.state;
        });

        svg.append('g').attr('class', 'legendLinear').attr('transform', 'translate(0,650)');


    //make the bar chart
var valueLabelWidth = 40; // space reserved for value labels (right)
var barHeight = 20; // height of one bar
var barLabelWidth = 100; // space reserved for bar labels
var barLabelPadding = 5; // padding between bar and bar labels (left)
var gridLabelHeight = 18; // space reserved for gridline labels
var gridChartOffset = 3; // space between start of grid and first bar
var maxBarWidth = 420; // width of the bar with the max value
 
// accessor functions 
var barLabel = function(d) { return d['State']; };
var barValue = function(d) { return parseFloat(d[' Brewerycount']); };
 
// scales
var yScale = d3.scaleOrdinal().domain(['CO','CA','MI','OR','TX','PA','MA','WA','IN','WI']).range([0,150]);
var y = function(d, i) { return yScale(i); };
var yText = function(d, i) { return y(d, i) + yScale.rangeBand() / 2; };
var x = d3.scaleLinear().domain([0, d3.max(toptenstates, barValue)]).range([0, maxBarWidth]);
// svg container element
var chart = d3.select('#barchart').append("svg")
  .attr('width', maxBarWidth + barLabelWidth + valueLabelWidth)
  .attr('height', gridLabelHeight + gridChartOffset + toptenstates.length * barHeight);
// grid line labels
var gridContainer = chart.append('g')
  .attr('transform', 'translate(' + barLabelWidth + ',' + gridLabelHeight + ')'); 
gridContainer.selectAll("text").data(x.ticks(10)).enter().append("text")
  .attr("x", x)
  .attr("dy", -3)
  .attr("text-anchor", "middle")
  .text(String);
// vertical grid lines
gridContainer.selectAll("line").data(x.ticks(10)).enter().append("line")
  .attr("x1", x)
  .attr("x2", x)
  .attr("y1", 0)
  .attr("y2", 150 + gridChartOffset)
  .style("stroke", "#ccc");
// bar labels
var labelsContainer = chart.append('g')
  .attr('transform', 'translate(' + (barLabelWidth - barLabelPadding) + ',' + (gridLabelHeight + gridChartOffset) + ')'); 
labelsContainer.selectAll('text').data(data).enter().append('text')
  .attr('y', yText)
  .attr('stroke', 'none')
  .attr('fill', 'black')
  .attr("dy", ".35em") // vertical-align: middle
  .attr('text-anchor', 'end')
  .text(barLabel);
// bars
var barsContainer = chart.append('g')
  .attr('transform', 'translate(' + barLabelWidth + ',' + (gridLabelHeight + gridChartOffset) + ')'); 
barsContainer.selectAll("rect").data(data).enter().append("rect")
  .attr('y', y)
  .attr('height', yScale.rangeBand())
  .attr('width', function(d) { return x(barValue(d)); })
  .attr('stroke', 'white')
  .attr('fill', 'steelblue');
// bar value labels
barsContainer.selectAll("text").data(data).enter().append("text")
  .attr("x", function(d) { return x(barValue(d)); })
  .attr("y", yText)
  .attr("dx", 3) // padding-left
  .attr("dy", ".35em") // vertical-align: middle
  .attr("text-anchor", "start") // text-align: right
  .attr("fill", "black")
  .attr("stroke", "none")
  .text(function(d) { return d3.round(barValue(d), 2); });
// start line
barsContainer.append("line")
  .attr("y1", -gridChartOffset)
  .attr("y2", yScale.rangeExtent()[1] + gridChartOffset)
  .style("stroke", "#000");



        // Legend
        var gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%")

        gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#edb950")
        .attr("stop-opacity", 1);

        gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#590c00")
        .attr("stop-opacity", 1);

        svg.append("rect")
        .attr('key', 'legend')
        .attr('x', 870)
        .attr('y', 325)
        .attr('width', 20)
        .attr('height', 200)
        .style('fill', 'url(#gradient)')

        svg.append("text")
        .attr('x', 895)
        .attr('y', 425)
        .attr("font-family", "Arial")
        .attr("font-size", 10)
        .attr("alignment-baseline", "central")
        .attr("font-weight", 900)
        .text('ABV(%)');

        svg.append("text")
        .attr('x', 895)
        .attr('y', 325)
        .attr("font-family", "Arial")
        .attr("font-size", 10)
        .attr("alignment-baseline", "central")
        .text('0.001');

        svg.append("text")
        .attr('x', 895)
        .attr('y', 525)
        .attr("font-family", "Arial")
        .attr("font-size", 10)
        .attr("alignment-baseline", "central")
        .text('0.128');

        svg.append("text")
        .attr('x', 480)
        .attr('y', 40)
        .attr("font-family", "Tahoma")
        .attr("font-size", 25)
        .attr("font-weight", 900)
        .attr("alignment-baseline", "central")
        .attr("text-anchor", "middle")
        .text('Average Alcohol by Volume of');

        svg.append("text")
        .attr('x', 480)
        .attr('y', 70)
        .attr("font-family", "Tahoma")
        .attr("font-size", 25)
        .attr("font-weight", 900)
        .attr("alignment-baseline", "central")
        .attr("text-anchor", "middle")
        .text('Beers Produced Per State')  ;        
    });
}