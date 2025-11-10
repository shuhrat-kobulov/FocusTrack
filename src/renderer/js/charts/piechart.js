let keys = [...history];

// Variables for graph rendering
let gInter;

// Note: Old button references removed as they don't exist in HTML
// The graph will auto-update when tracking starts

document.getElementById('start-btn').addEventListener('click', () => {
    if (gInter) {
        clearInterval(gInter);
    }
    gInter = setInterval(() => {
        keys = [...history];
        update(makeData(data));
    }, 2000);
});

var data = Array();

var width = 250,
    height = 250,
    radius = Math.min(width, height) / 2;

var svg = d3
    .select('#pie')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

svg.append('g').attr('class', 'slices');
svg.append('g').attr('class', 'labels');
svg.append('g').attr('class', 'lines');

var pie = d3
    .pie()
    .sort(null)
    .value(function (d) {
        return d.value;
    });

var arc = d3
    .arc()
    .outerRadius(radius * 1.0)
    .innerRadius(radius * 0.0);

var outerArc = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius * 1);

var key = function (d) {
    return d.data.label;
};

var color = d3.scaleOrdinal(d3.schemePastel1);

let renderBtn = document.getElementById('render-btn');
let isRendering = false;
renderBtn.addEventListener('click', () => {
    if (isRendering) {
        // Stop rendering
        if (gInter) {
            clearInterval(gInter);
            gInter = null;
        }
        renderBtn.textContent = 'Start Rendering';
        isRendering = false;
    } else {
        // Start rendering
        gInter = setInterval(function () {
            keys = [...history];
            update(makeData(data));
        }, 2000);
        renderBtn.textContent = 'Stop Rendering';
        isRendering = true;
    }
});

function mergeWithFirstEqualZero(first, second) {
    var secondSet = d3.set();

    second.forEach(function (d) {
        secondSet.add(d.label);
    });

    var onlyFirst = first
        .filter(function (d) {
            return !secondSet.has(d.label);
        })
        .map(function (d) {
            return { label: d.label, value: 0 };
        });

    var sortedMerge = d3.merge([second, onlyFirst]).sort(function (a, b) {
        return d3.ascending(a.label, b.label);
    });

    return sortedMerge;
}

function makeData(data) {
    // Safety check: ensure we have keys and the element exists
    if (!keys || keys.length === 0) {
        return data;
    }

    let hTag = document.getElementById(`${keys[keys.length - 1]}`);
    if (!hTag) {
        return data;
    }

    let [hours, minutes, seconds] = hTag.innerHTML.split(':');
    hours = Number(hours);
    minutes = Number(minutes);
    seconds = Number(seconds);
    let usageTime = hours * 60 + minutes * 60 + seconds;
    var ob = {};
    ob['label'] = keys[keys.length - 1];
    ob['value'] = usageTime;

    function findObjectByKey(array, key, value) {
        for (var i = 0; i < array.length; i++) {
            if (array[i][key] === value) {
                return i;
            }
        }
        return null;
    }

    var idx = findObjectByKey(data, 'label', keys[keys.length - 1]);
    if (idx !== null) {
        data[idx] = ob;
    } else {
        data.push(ob);
    }
    var sortedData = data.sort(function (a, b) {
        return d3.ascending(a.label, b.label);
    });

    return sortedData;
}

function update(data) {
    var duration = 500;

    var oldData = svg
        .select('.slices')
        .selectAll('path')
        .data()
        .map(function (d) {
            return d.data;
        });

    if (oldData.length == 0) oldData = data;

    var was = mergeWithFirstEqualZero(data, oldData);
    var is = mergeWithFirstEqualZero(oldData, data);

    var slice = svg.select('.slices').selectAll('path').data(pie(was), key);

    slice
        .enter()
        .insert('path')
        .attr('class', 'slice')
        .style('fill', function (d) {
            return color(d.data.label);
        })
        .each(function (d) {
            this._current = d;
        });

    slice = svg.select('.slices').selectAll('path').data(pie(is), key);

    slice
        .transition()
        .duration(duration)
        .attrTween('d', function (d) {
            var interpolate = d3.interpolate(this._current, d);
            var _this = this;
            return function (t) {
                _this._current = interpolate(t);
                return arc(_this._current);
            };
        });

    slice = svg.select('.slices').selectAll('path').data(pie(data), key);

    slice.exit().transition().delay(duration).duration(0).remove();

    // Update legend
    updateLegend(data);
}

function updateLegend(data) {
    if (!data || data.length === 0) {
        d3.select('#legend').html('');
        return;
    }

    // Calculate total time
    var total = d3.sum(data, function (d) {
        return d.value;
    });

    // Create legend HTML
    var legendHTML = '<div style="display: inline-block; text-align: left;">';
    legendHTML += '<h5 style="margin-bottom: 10px;">Application Usage</h5>';

    data.forEach(function (d) {
        var percentage = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
        var hours = Math.floor(d.value / 3600);
        var minutes = Math.floor((d.value % 3600) / 60);
        var seconds = d.value % 60;
        var timeStr = hours + 'h ' + minutes + 'm ' + seconds + 's';

        legendHTML += '<div style="margin: 5px 0;">';
        legendHTML +=
            '<span style="display: inline-block; width: 15px; height: 15px; background-color: ' +
            color(d.label) +
            '; margin-right: 8px; vertical-align: middle;"></span>';
        legendHTML +=
            '<strong>' +
            d.label +
            '</strong>: ' +
            timeStr +
            ' (' +
            percentage +
            '%)';
        legendHTML += '</div>';
    });

    legendHTML += '</div>';

    d3.select('#legend').html(legendHTML);
}
