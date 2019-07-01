let viewDatasets = {
    addFile: function(fileName) {
        let newFileListing = document.createElement("option"),
            newFileName = document.createTextNode(fileName),
            datasets = document.querySelector("#uploaded-files");
        
        newFileListing.id = fileName;
        newFileListing.appendChild(newFileName);
        datasets.appendChild(newFileListing);
    }
}

let viewMiniChart = {
    init: function(data) {
        this.svg = d3.select("#mini-chart");
        this.svg.selectAll("*").remove();
        const width = parseFloat(this.svg.style("width")),
            height = parseFloat(this.svg.style("height"));
        this.margin = {
            x: width * 0.1,
            y: height * 0.1
        }
        const {svg, margin} = this;
        this.chart = d3.select("#mini-chart").append("g")
            .style("transform", `translate(${margin.x}px, ${margin.y}px)`);

        // Find max value of MS intensities
        let col = data.columns.find((ele) => ele.match(/;/)),
            stringVals = "";
        if (!col) { return }
        data.forEach(ele => stringVals += ele[col] + ";");
        const vals = stringVals.split(";").map((ele) => Number(ele)),
            maxVal = d3.max(vals);
        
        // Set up scales
        this.xScale = d3.scaleLinear()
            .domain([0, maxVal])
            .range([0, width - 2 * margin.x]);
        let valsPerDatum = data[0][col].split(";").length,
            samples = [];
        for (let i = 0; i < valsPerDatum; i++) { samples.push("s" + i); }
        this.yScale = d3.scaleBand()
            .domain(samples)
            .range([0, height - 2 * margin.y])
            .padding(0.5);
        const xAxis = d3.axisBottom(this.xScale)
            .ticks(5);
        const yAxis = d3.axisLeft(this.yScale);

        // Draw axes
        svg.append("g")
            .style("transform", `translate(${margin.x}px,${height - margin.y}px)`)
            .call(xAxis);
        svg.append("g")
            .style("transform", `translate(${margin.x}px, ${margin.y}px)`)
            .call(yAxis);
    },
    render: function(name, data) {
        const {svg, chart, margin, xScale, yScale} = this,
            tooltip = d3.select(".tooltip"),
            tooltipDuration = 500;
        // Draw title
        svg.select(".mini-chart-title").remove()
        svg.append("text")
            .attr("class", "mini-chart-title")
            .text(name)
            .style("font", "sans-serif")
            .style("font-size", 14)
            .attr("text-anchor", "middle")
            .attr("x", "50%")
            .attr("y", margin.y - 10);

        // Draw bar chart
        const bar = chart.selectAll(".bar").data(data);
        const barsEnter = bar.enter().append("rect")
            .attr("class", "bar")
            .on("mouseover", function(d) {
                d3.select(this).transition()
                    .duration(150)
                    .style("opacity", 0.5);
                console.log(d3.event)
                tooltip.style("opacity", 0.9)
                    .html("Value: " + d)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).transition()
                    .duration(150)
                    .style("opacity", 1);
                tooltip.style("opacity", 0);
            });

        bar.merge(barsEnter).transition().duration(750)
            .attr("width", (d) => xScale(d))
            .attr("height", yScale.bandwidth())
            .attr("y", (d, i) => yScale("s" + i))
            .attr("fill", "#2a5599")
    }
}
