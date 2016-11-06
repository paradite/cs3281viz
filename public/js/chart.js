d3.tip = require('./vendor/d3-tip');

// DOM Manipulation through d3.js
var chart = (function() {
  var _chartElement = null;
  var _svgWrapper = null;
  var _xAxisElement = null;
  var _brushAxisElement = null;
  var _clipRect = null;

  var _xScale = null;
  var _brushxScale = null;

  var COMMIT_STYLE = {
    fill: 'white',
    color: 'green',
    r: 3.5,
    'stroke-width': 2
  };

  var rowColorOdd = 'black';
  var rowColorEven = 'rgb(96,125,139)';

  var module = {};

  module.rowHeight = 45;

  var brushHeight = 15;
  var brushMargin = 50;

  var brush = d3.svg.brush();
  var gBrush;

  function brushed() {
    if (!d3.event.sourceEvent) return; // only transition after input
    // var extent0 = brush.extent();

    // if empty when rounded, use floor & ceil instead
    // if (extent1[0] >= extent1[1]) {
    //   extent1[0] = d3.time.day.floor(extent0[0]);
    //   extent1[1] = d3.time.day.ceil(extent0[1]);
    // }

    // d3.select(this).transition()
    //   .call(brush.extent(extent0))
    //   .call(brush.event);

    // Update scale
    _xScale.domain(brush.empty() ? _brushxScale.domain() : brush.extent());
    reScaleData();
  }

  function reScaleData() {
    module.updateAxisElment();
    reScaleCommits();
  }

  function reScaleCommits() {
    _chartElement
      .selectAll('circle.commit')
      .attr('cx', function(d) {
        return _xScale(viz.data.dateAccessor(d));
      });
  }

  function applyStyle(style, tip) {
    this.attr('r', function(d) {
        return style.r * Math.log2(viz.data.sizeAccessor(d) + 1);
      })
      .attr('fill', style.fill)
      .attr('stroke', style.color)
      .attr('stroke-width', style['stroke-width'])
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide);
  }

  function getTooltipContent(d) {
    var text = viz.data.getPrimaryTooltipData(d);

    if (d.commits.length <= viz.data.MAX_COMMITS) {
      for (var i = 0; i < d.commits.length; i++) {
        text += formatSecondaryData(viz.data.getSecondaryTooltipDataByIndex(d, i));
      }
    } else {
      for (i = 0; i < viz.data.MAX_COMMITS; i++) {
        text += formatSecondaryData(viz.data.getSecondaryTooltipDataByIndex(d, i));
      }
      text += formatAdditionalData(viz.data.getAdditionalTooltipData(d));
    }
    return text;
  }

  function formatSecondaryData(data) {
    return '<br><span class="secondary">' + data + '</span>';
  }

  var formatAdditionalData = formatSecondaryData;

  module.init = function(width, height, margin) {
    _xScale = d3.time.scale().range([5, width - 5]);
    _brushxScale = d3.time.scale().range([5, width - 5]);

    module.margin = margin;
    module.width = width;
    module.height = height;

    _svgWrapper = d3.select('#container')
      .append('svg')
      .attr('id', 'viz')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    gBrush = _svgWrapper.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      .attr('class', 'brush');

    // _brushAxisElement = _svgWrapper.append('g')
    //   .attr('class', 'x axis')
    //   .attr('transform', 'translate(' + margin.left + ',' + (margin.top + brushHeight) + ')');

    var container = _svgWrapper.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + (margin.top + brushHeight + brushMargin) + ')')
      .style('pointer-events', 'all');

    _clipRect = container.append('clipPath')
      .attr('id', 'myClip')
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#FFFFFF');

    _chartElement = container.append('g')
      .attr('width', width)
      .attr('height', height)
      .attr('clip-path', 'url(#myClip)')
      .classed('chart', true);

    _xAxisElement = container.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')');

    // xAxisElement.append("text")
    //     .attr("class", "x-axis-label")
    //     .attr("x", width)
    //     .attr("y", 35)
    //     .style("text-anchor", "end")
    //     .text("time");
  };

  module.displayCommits = function(user, data) {
    var row = _chartElement.select('.' + user.username);
    console.log(data);
    var circles = row.selectAll('circle.commit')
      .data(data);

    var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-5, 0])
      .html(function(d) {
        return getTooltipContent(d);
      });
    _svgWrapper.call(tip);

    circles.enter()
      .append('circle')
      .classed('commit', true);

    applyStyle.call(circles, COMMIT_STYLE, tip);

    // update position
    circles.attr('cx', function(d) {
      return _xScale(viz.data.dateAccessor(d));
    });
    if (user.name) {
      row.select('.info')
        .text('@' + user.username + ' (' + user.name + ')');
    } else {
      row.select('.info')
        .text('@' + user.username);
    }

    reScaleData();
  };

  module.initRow = function(user, rowNum) {
    var FIRST_ROW_MARGIN = 15;

    var rowColor = (rowNum % 2 === 0) ? rowColorEven : rowColorOdd;

    var row = _chartElement.append('g')
      .attr('transform', 'translate(0,' + ((rowNum) * module.rowHeight + FIRST_ROW_MARGIN) + ')')
      .attr('width', module.width)
      .classed(user.username, true);

    row.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', module.width)
      .attr('y2', 0)
      .attr('stroke-width', 1)
      .attr('stroke', rowColor);

    row.append('text')
      .classed('info', true)
      .text('@' + user.username)
      .attr('y', 8)
      .attr('fill', rowColor)
      .style('dominant-baseline', 'text-before-edge');

    module.resizeHeight(module.height + module.rowHeight);
  };

  module.resizeHeight = function(newHeight) {
    module.height = newHeight;

    _svgWrapper.attr('height', newHeight + module.margin.top + module.margin.bottom);

    _clipRect.attr('height', newHeight);

    _chartElement.attr('height', newHeight);

    _xAxisElement.attr('transform', 'translate(0,' + newHeight + ')');
  };

  module.updateAxisElment = function() {
    var xAxis = d3.svg.axis()
      .scale(_xScale)
      .orient('bottom')
      .tickFormat(d3.time.format('%d %b'))
      .ticks(d3.time.day, 2)
      .tickSize(5);

    // var brushxAxis = d3.svg.axis()
    //   .scale(_brushxScale)
    //   .orient('bottom')
    //   .ticks(0)
    //   .tickFormat(d3.time.format('%d %b'))
    //   .tickSize(0);

    _xAxisElement.call(xAxis);
    // _brushAxisElement.call(brushxAxis);
  };

  module.setScaleDomain = function(domain) {
    var duration = (domain[1].getTime() - domain[0].getTime()) / 4 * 3;
    if (duration > 1296000000) { // 1000*60*60*24*15 15 days
      duration = 1296000000;
    }
    var midpoint = new Date(domain[1].getTime() - duration);

    _xScale.domain(domain);
    _brushxScale.domain(domain);

    brush.x(_brushxScale)
      .extent([midpoint, domain[1]])
      .on('brush', brushed);

    gBrush
      .call(brush)
      .call(brush.event);

    gBrush.selectAll('rect.extent')
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('height', brushHeight);

    gBrush.selectAll('rect.background')
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('height', brushHeight)
      .style('visibility', 'visible');

    _xScale.domain(brush.empty() ? _brushxScale.domain() : brush.extent());
  };

  module.getScale = function() {
    return _xScale;
  };

  return module;
})();

module.exports = chart;
