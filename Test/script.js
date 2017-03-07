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
    .defer(d3.csv,"beers.csv")
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
        brewscale = d3.scaleSqrt().domain(brewextent).range([.7,1.1])

        borders = g.selectAll('.tiles').data(tiles.features).enter().append('path').attr('d', path).attr('viewBox',path).attr('class', 'border')
        .attr('fill', function (d) {
            if (isNaN(d.avgabv)){
                return linear(.05);
            }
            return linear(d.avgabv);
        })
        .attr('stroke', 'white').attr('stroke-width', 4)
        .attr('transform', function (x){
            return 'translate(' +path.centroid(x)[0] + ' ' + path.centroid(x)[1] +')scale(' + brewscale(x.brewcount) + ')' + 'translate(' + -path.centroid(x)[0] + ' ' + -path.centroid(x)[1] + ')';
        });

        // // add some labels
        g.selectAll('.state-label').data(tiles.features).enter().append('text').attr('class', function (d) {
            return 'state-label state-label-' + d.id;
        }).attr('transform', function (d) {
            console.log(path.centroid(d));
            return 'translate(' + path.centroid(d) + ')';
        }).attr('fill', 'white')
        .text(function (d) {
            return d.properties.state;
        });

        svg.append('g').attr('class', 'legendLinear').attr('transform', 'translate(0,650)');

    });
}