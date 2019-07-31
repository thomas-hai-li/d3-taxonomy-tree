let viewSamples = {
    init: function() {
        this.menu = [    
            {
                title: "Remove",
                action: function (ele, d, i) {
                    ele.remove();                    
                }
            }
        ];
    },
    clearPrevious: function() {
        d3.select("#samples").selectAll("*").remove();
    },
    addSample: function(sampleName) {
        // Add to list and attach contextmenu
        let newSampleOption = document.createElement("option"),
            newSampleText = document.createTextNode(sampleName),
            sampleList = document.querySelector("#samples");

        newSampleOption.id = sampleName;
        newSampleOption.classList.add("sample-option");
        newSampleOption.appendChild(newSampleText);
        sampleList.appendChild(newSampleOption);
        d3.select(newSampleOption).on("contextmenu", d3.contextMenu(this.menu));
    },
    drawTable: function (data) {
        d3.select("#csv-display").style("display", "block");
        d3.select("#chart-display").style("display", "none");
        // Reset and generate the top row (col names)
        let cols = data.columns,
            topRow = document.createElement("tr"),
            tableHead = document.querySelector(".csv-data thead");
        while (tableHead.firstChild) {
            tableHead.removeChild(tableHead.firstChild);
        }
        let numCol = document.createElement("th"),
            numColText = document.createTextNode("#");
        numCol.appendChild(numColText);
        topRow.appendChild(numCol);
        cols.forEach((colName) => {
            let newCol = document.createElement("th"),
                newColText = document.createTextNode(colName);
            newCol.appendChild(newColText);
            newCol.scope = "col";
            topRow.appendChild(newCol);
        });
        tableHead.appendChild(topRow);
        
        // Reset and generate remaining rows (actual data)
        let tableBody = document.querySelector(".csv-data tbody");
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        data.forEach((d, i) => {
            let newRow = document.createElement("tr");
            let numRow = document.createElement("th"),
                numRowText = document.createTextNode(i + 1);
            numRow.appendChild(numRowText);
            newRow.appendChild(numRow);
            cols.forEach((col) => {
                let newCell = document.createElement("td"),
                    newCellText = document.createTextNode(d[col]);
                newCell.appendChild(newCellText);
                newRow.appendChild(newCell);
            });
            tableBody.appendChild(newRow);
        });
    }
}

let viewMiniChart = {
    init: function(data) {
        this.svg = d3.select("#mini-chart");
        this.svg.selectAll("*").remove();
        const width = parseFloat(this.svg.style("width")),
            height = parseFloat(this.svg.style("height"));
        this.margin = {
            x: width * 0.15,
            y: height * 0.1
        }
        const {svg, margin} = this;
        this.chart = d3.select("#mini-chart").append("g")
            .style("transform", `translate(${margin.x}px, ${margin.y}px)`);

        let areSamples = data[0].samples;
        if (!areSamples) { return }
            
        // Find max value of MS intensities
        let values = [];
        data.forEach(ele => { values = values.concat(Object.values(ele.samples)); });
        const maxVal = d3.max(values);
        
        this.intensities =  Object.keys(data[0].samples).map((ele) => {
            return ele.replace("Intensity", "").trim();
        });
        
        // Set up scales
        this.xScale = d3.scaleLinear()
            .domain([0, maxVal])
            .range([0, width - 2 * margin.x]);
        this.yScale = d3.scaleBand()
            .domain(this.intensities)
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
            duration = 200;
        // Draw title
        svg.select(".mini-chart-title").remove()
        svg.append("text")
            .attr("class", "mini-chart-title")
            .text(name)
            .style("font", "sans-serif")
            .style("font-size", "14px")
            .attr("text-anchor", "middle")
            .attr("x", "50%")
            .attr("y", margin.y - 10);

        // Draw bar chart
        const bar = chart.selectAll(".bar").data(data);
        const barsEnter = bar.enter().append("rect")
            .attr("class", "bar")
            .on("mouseover", function(d) {
                d3.select(this).transition()
                    .duration(duration)
                    .style("opacity", 0.5);
                tooltip.transition()
                    .duration(duration)
                    .style("opacity", 0.9);
                tooltip.html("Intensity: " + d)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).transition()
                    .duration(duration)
                    .style("opacity", 1);
                tooltip.transition()
                    .duration(duration)
                    .style("opacity", 0);
            });
    
        bar.merge(barsEnter).transition().duration(750)
            .attr("width", (d) => xScale(d))
            .attr("height", yScale.bandwidth())
            .attr("y", (d, i) => yScale(this.intensities[i]))
            .attr("fill", "#2a5599");
    }
}
