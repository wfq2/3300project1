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
var i;
function render() {

    var w = 960;
    var h = 560;
    var d3 = window.d3;
    var _ = window._;

    // Hexagon map - help from https://bl.ocks.org/eesur/8678df74ee7efab6d645de07a79ebcc5
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

        linear = d3.scaleLinear().domain(abvextent).range(['#ffd700', '#800000']);
        brewscale = d3.scaleSqrt().domain(brewextent).range([.7,1.1])

        borders = g.selectAll('.tiles').data(tiles.features).enter().append('path').attr('d', path).attr('viewBox',path).attr('class', 'border')
        .attr('fill', function (d) {
            if (isNaN(d.avgabv)){
                return linear(.05);
            }
            return linear(d.avgabv);
        })
        .attr('stroke', 'white')
        .attr('stroke-width', 4)

        // // add some labels
        g.selectAll('.state-label').data(tiles.features).enter().append('text').attr('class', function (d) {
            return 'state-label state-label-' + d.id;
        }).attr('transform', function (d) {
            return 'translate(' + path.centroid(d) + ')';
        }).attr('fill', 'white')
        .text(function (d) {
            return d.properties.state;
        });


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


        // Pie chart - help from http://zeroviscosity.com/d3-js-step-by-step/step-1-a-basic-pie-chart

        (function(d3) {
            'use strict';

            var styledict = [];
            var ales = 0;
            var lagers = 0;
            var IPA = 0;
            var porters = 0;
            var stouts = 0;
            var other = 0;

            beermap.forEach(function(y) {
                var counter = 0;
                
                if (y.style.includes('Lager')) {
                    lagers += 1;
                } else if (y.style.includes('IPA')) {
                    IPA += 1;
                } else if (y.style.includes('Porter')) {
                    porters += 1;
                } else if (y.style.includes('Stout')) {
                    stouts += 1;
                } else if (y.style.includes('Ale')) {
                    ales += 1;
                } else {
                    other += 1;
                };
            });

            styledict = [
                {style: 'Ales', count: ales},
                {style: 'Lagers', count: lagers},
                {style: 'IPA', count: IPA},
                {style: 'Porters', count: porters},
                {style: 'Stouts', count: stouts},
                {style: 'Other', count: other}
            ]

            var width = 350;
            var height = 350;
            var radius = Math.min(width, height) / 2;

            var color = d3.scaleOrdinal(d3.schemeCategory20b);

            var svg2 = d3.select('#vis')
              .append('svg')
              .attr('width', 500)
              .attr('height', 450)
              .append('g')
              .attr('transform', 'translate(' + 250 +
                ',' + 250 + ')');

            svg2.append("text")
            .attr('x', 0)
            .attr('y', -215)
            .attr("font-family", "Tahoma")
            .attr("font-size", 25)
            .attr("font-weight", 900)
            .attr("alignment-baseline", "central")
            .attr("text-anchor", "middle")
            .text('Top Beer Styles in the U.S.');

            var arc = d3.arc()
              .innerRadius(0)
              .outerRadius(radius);

            var pie = d3.pie()
              .value(function(d) { return d.count; })
              .sort(null);

            var path = svg2.selectAll('path')
              .data(pie(styledict))
              .enter()
              .append('path')
              .attr('d', arc)
              .attr('fill', function(d) {
                return color(d.data.style);
              });

            svg2.append("text")
            .attr('x', 85)
            .attr('y', -20)
            .attr("font-family", "Tahoma")
            .attr("font-size", 14)
            .attr("fill", 'white')
            .attr("alignment-baseline", "central")
            .attr("text-anchor", "middle")
            .text('Ales');

            svg2.append("text")
            .attr('x', 70)
            .attr('y', 130)
            .attr("font-family", "Tahoma")
            .attr("font-size", 14)
            .attr("fill", 'white')
            .attr("font-weight", 550)
            .attr("alignment-baseline", "central")
            .attr("text-anchor", "middle")
            .text('Lagers');

            svg2.append("text")
            .attr('x', -60)
            .attr('y', 85)
            .attr("font-family", "Tahoma")
            .attr("font-size", 14)
            .attr("fill", 'white')
            .attr("alignment-baseline", "central")
            .attr("text-anchor", "middle")
            .text('India Pale Ale (IPA)');

            svg2.append("text")
            .attr('x', -139)
            .attr('y', -2)
            .attr("font-family", "Tahoma")
            .attr("font-size", 14)
            .attr("fill", 'white')
            .attr("font-weight", 550)
            .attr("alignment-baseline", "central")
            .attr("text-anchor", "middle")
            .text('Porters');

            svg2.append("text")
            .attr('x', -140)
            .attr('y', -30)
            .attr("font-family", "Tahoma")
            .attr("font-size", 14)
            .attr("fill", 'white')
            .attr("font-weight", 550)
            .attr("alignment-baseline", "central")
            .attr("text-anchor", "middle")
            .text('Stouts');

            svg2.append("text")
            .attr('x', -60)
            .attr('y', -90)
            .attr("font-family", "Tahoma")
            .attr("font-size", 14)
            .attr("fill", 'white')
            .attr("alignment-baseline", "central")
            .attr("text-anchor", "middle")
            .text('Other');

          })(window.d3);

    });
};