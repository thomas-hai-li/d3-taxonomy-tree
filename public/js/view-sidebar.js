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
    render: function(data) {
        // Reset chart:
        const svg = d3.select("#mini-chart");
        svg.selectAll("*").remove();
        const width = parseFloat(svg.style("width")),
            height = parseFloat(svg.style("height"));
        const margin = {
            x: width * 0.1,
            y: height * 0.1
        }
        const chart = d3.select("#mini-chart").append("g")
            .style("transform", `translate(${margin.x}px, ${margin.y}px)`);

        // Set up scales
        const maxVal = d3.max(data);
        const xScale = d3.scaleLinear()
            .domain([0, maxVal])
            .range([0, width - 2 * margin.x]);
        const yScale = d3.scaleBand()
            .domain(data.map((d, i) => i))
            .range([0, height - 2 * margin.y])
            .padding(0.5);
        let xAxis = d3.axisBottom(xScale)
            .ticks(5);
        let yAxis = d3.axisLeft(yScale);

        // Draw bar chart
        const bars = chart.selectAll(".bar").data(data);
        bars.enter().append("rect")
            .attr("class", "bar")
            .attr("height", yScale.bandwidth())
            .attr("y", (d, i) => yScale(i))
            .attr("width", (d) => xScale(d))
            .attr("fill", "#2a5599");

        // Draw axes
        svg.append("g")
            .style("transform", `translate(${margin.x}px,${height - margin.y}px)`)
            .call(xAxis);
        svg.append("g")
            .style("transform", `translate(${margin.x}px, ${margin.y}px)`)
            .call(yAxis);
    }
}
