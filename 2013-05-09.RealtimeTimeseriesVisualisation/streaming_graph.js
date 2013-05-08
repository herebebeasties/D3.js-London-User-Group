function StreamingGraph(data, selector, duration, tick_rate, error_threshold) {
    this.data = data;
    this.duration = duration;
    this.tick_rate = tick_rate;
    this.error_threshold = error_threshold;
    
    var attachToElement = d3.select(selector);
    var uid = Math.random().toString(36).substr(2, 9);
    
    var now = Date.now();
    var tick_history = [ now, now, now ];
    
    var margin = { top: 10, right: 10, bottom: 24, left: 40 };
    var width = attachToElement.property("offsetWidth") - margin.left - margin.right;
    var height = attachToElement.property("offsetHeight") - margin.top - margin.bottom;
    
    var that = this;
    
    function make_x_axis() {
        return d3.svg.axis().scale(x).orient("bottom");
    }
    
    function make_y_axis() {
        return d3.svg.axis().scale(y).orient("left").ticks(height / 20);
    }
    
    function linear_transition(obj, redraw) {
        obj.transition()
            .duration(that.tick_rate)
            .ease("linear")
            .call(redraw);
    }
    
    function tick() {
        previous_tick = tick_history[0];
        tick_history.unshift(Date.now());  // push onto front
        tick_history.pop();
        
        // Pop expired data off the front
        var time_threshold = previous_tick - that.duration;
        while ((that.data.length > 2 && that.data[2].time < time_threshold) ||
                that.data.length > 0 && that.data[that.data.length - 1] < time_threshold) {
            that.data.shift();
        }
        
        x.domain([previous_tick - that.duration, tick_history[2]]);
        y.domain([0, that.data.reduce(function(prev, current, i, array) {
            return Math.ceil(Math.max(current.value, prev));
        }, 0)]);
        
        var isError = that.data.reduce(function(prev, current, i, array) {
            return current.value > that.error_threshold | prev;
        }, false);
        
        // Redraw the line and slide it to the left
        svg.select(".line")
            .attr("d", line)
            .attr("transform", null);
        path.transition()
            .duration(that.tick_rate)
            .ease("linear")
            .attr("class", "line" + (isError ? " error" : ""))
            .attr("transform", "translate(" + x(tick_history[2] - that.duration) + ")")
            .each("end", tick);  // once we're done, tick() again
        
        // Also transition the axes, and the grids:
        linear_transition(x_axis, x.axis);
        linear_transition(y_axis, y.axis);
        linear_transition(x_grid, x.grid);
        linear_transition(y_grid, y.grid);
    }
    
    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([0, 0])
        .range([height, 0]);
        
    var line = d3.svg.line()
        .interpolate("linear")
        .x(function(d, i) { return x(d.time); })
        .y(function(d, i) { return y(d.value); });
    
    var svg = attachToElement
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    svg.append("defs").append("clipPath")
        .attr("id", "clip" + uid)
        .append("rect")
        .attr("width", width)
        .attr("height", height);
    
    var x_grid = svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(x.grid = make_x_axis()
            .tickSize(-height, 0, 0)
            .tickFormat(""));
    
    var y_grid = svg.append("g")
        .attr("class", "grid")
        .call(y.grid = make_y_axis()
            .tickSize(-width, 0, 0)
            .tickFormat(""));
    
    var x_axis = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(x.axis = make_x_axis());

    var y_axis = svg.append("g")
        .attr("class", "y axis")
        .call(y.axis = make_y_axis());
    
    var path = svg.append("g")
        .attr("clip-path", "url(#clip" + uid + ")")
        .append("path")
        .data([this.data])
        .attr("class", "line")
        .attr("d", line);
    
    // Kick it all off
    tick();
}