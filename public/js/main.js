let model = {
    dim: {
        width: parseInt(d3.select("#chart-display").style("width")),
        height: parseInt(d3.select("#chart-display").style("height"))
    },
    chartType: document.getElementById("chart-selection").value,
    currentData: null,  // Array of objects, loaded from csv
    currentSample: null,  // String, determined from user selection
    hierarchical: {
        root: null,
        tree: null,
        treemap: null,
        color: {
            currentRank: 2,
            ranks: {
                // Keys based on number of "@" in the id of each data point
                2: "Kingdom",
                3: "Phylum",
                4: "Class",
                5: "Order",
                6: "Family",
                7: "Genus",
                8: "Species"
            },
            // Color schemes for nodes:
            taxonLevelColor: d3.scaleOrdinal()
                .domain(d3.range(0, 10))
                .range(d3.schemeAccent),
            branchColor: d3.scaleOrdinal()
                .range(d3.schemeSet3)
        }
    },
}

let ctrlMain = {
    // Responsible for file handling, building charts, and getting/setting data from model
    init: function() {
        viewSamples.init();
        viewTreeChart.init();
        viewHierarchicalBarChart.init();
        viewStaticTreemapChart.init();
        viewCirclePacking.init();
        viewZoom.init();
        // viewBrush.init();
        this.onFileChange();
        this.onChartTypeChange();
        // Load data from global variable and save each node's value if it changes
        let dataParsed = JSON.parse(data);
        console.log(dataParsed)
        
        this.parseSamples(dataParsed);
        this.setCurrentData(dataParsed);
        this.callSamples(this.getCurrentData());
        this.buildChart(this.getCurrentData());     // load the data immediately
    },
    onFileChange: function() {
        const upload = document.querySelector("#file-upload");

        upload.addEventListener("change", (e) => {
            const file = e.target.files[0],
                fileTypeCSV = /csv.*/;

            if (file.name.match(fileTypeCSV)) {
                // parse the csv and set as current data
                const reader = new FileReader();
                reader.onload = () => {
                    const data = d3.csvParse(reader.result);    // array of objects
                    this.parseSamples(data);
                    this.setCurrentData(data);
                    // Setup samples in the list
                    this.callSamples(data);
                    // build the chart
                    this.buildChart(this.getCurrentData());
                }
                reader.readAsText(file);
            }
            else {
                $("#warning-modal").modal()
            }
        });
    },
    onChartTypeChange: function() {
        const chartSelection = document.getElementById("chart-selection");
        chartSelection.addEventListener("change", () => {
            const type = chartSelection.value,
                data = this.getCurrentData();
            this.setChartType(type);
            if (data) {
                this.buildChart(data);
            }
        });
    },
    parseSamples: function(data) {
        // Accepts array of objects as data, parses for the individual samples and saves as a sub-object
        // In the csv, the column is usually formatted as such: "Intensity s1; Intensity s2; Intensity s3; ..."
        data = data.map((e) => {
            e.value = +e.value;
            e.avgIntensity = e.value;   // the "value" column in the originial csv is the average MS intensity
            
            const col = Object.keys(e).find((ele) => ele.match(/;/)),
                sampleNames = col.split(";"),
                sampleIntensies = e[col].split(";").map(val => +val);
            delete e[col];
            e.samples = new Object();
            sampleNames.forEach((sample, i) => {
                e.samples[sample] = sampleIntensies[i];
            });
            return e;
        });
    },
    callSamples: function(data) {
        // Accepts array of objects as data, gets samples if they exist and calls the view to render them.
        if (! data[0].samples) { return; }
        const sampleNames = Object.keys(data[0].samples);
        viewSamples.clearPrevious();
        sampleNames.forEach((sample) => {
            viewSamples.addSample(sample);
        });
        // On sample selection, display the correct information in chart
        d3.select("#samples")
            .on("change", function() {
                let sample = this.value;
                ctrlMain.setCurrentSample(sample);
                data.map((e) => {
                    e.value = e.samples[sample];
                    return e;
                });
                ctrlMain.buildChart(data);
            });
    },
    buildChart: function(data) {
        // Accepts array of objects (csv) as data
        // document.querySelector("#chart-display").style.display = "block";    // for removing tabular csv view
        // document.querySelector("#csv-display").style.display = "none";
        
        const type = this.getChartType();
        switch (type) {
            case "simple-tree":
            case "radial-tree":
                this.buildRoot(data);
                this.buildTree();
                viewTreeChart.render(type);
                // viewBrush.render();
                ctrlToolbar.initTreeChart();
                viewMiniChart.init(data);
                break;
            case "hierarchical-bars":
                this.buildRoot(data);
                viewHierarchicalBarChart.render();
                // render barchart
                // disable toolbar
                // disable mini chart?
                break;
            case "static-treemap":
                this.buildRoot(data);
                this.buildTreemap();
                viewStaticTreemapChart.render();
                ctrlToolbar.initTreemapChart();
                viewMiniChart.init(data);
                break;
            case "circle-packing":
                this.buildRoot(data);
                this.buildPack();
                viewCirclePacking.render();
                viewMiniChart.init(data);
        }
        ctrlExportChart.init();
    },
    buildRoot: function(data) {
        // Generate the root data structure
        let stratify = d3.stratify()
            .parentId(d => d.id.substring(0, d.id.lastIndexOf("@")));
        let root = stratify(data);

        model.hierarchical.root = root;
    },
    buildTree: function() {
        // Generate the tree layout function
        // const { width, height } = this.getDim();
        const tree = d3.tree()
            .size([360, 500])
            .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

        model.hierarchical.tree = tree;
    },
    buildTreemap: function() {
        const { width, height } = this.getDim();
        const treemap = d3.treemap()
            .size([width*0.95, height*0.95]);
        
        model.hierarchical.treemap = treemap;
    },
    buildPack: function() {
        const { width, height } = this.getDim();
        const pack = d3.pack()
            .size([width, height]);
        
        model.hierarchical.pack = pack;
    },
    setCurrentData: (data) => model.currentData = data,
    setCurrentSample: (sample) => model.currentSample = sample,
    setChartType: (type) => model.chartType = type,
    getCurrentData: () => model.currentData,
    getCurrentSample: () => model.currentSample,
    getChartType: () => model.chartType,
    getDim: () => model.dim,
    getHierarchical: () => model.hierarchical,
    submitFeedback: () => {
        let messageToUser = document.querySelector("#feedback-result"),
            name = document.querySelector("#feedback-name").value,
            organization = document.querySelector("#feedback-organization").value,
            comments = document.querySelector("#feedback-comments").value;

        if (comments === "") {
            messageToUser.textContent = "Form cannot be blank.";
        }
        else {
            let http = new XMLHttpRequest();
            http.open("POST", "/feedback", true);
            http.setRequestHeader("Content-type","application/x-www-form-urlencoded");
            let params = `name=${name}&` +
            `organization=${organization}&` + 
            `comments=${comments}`;
            http.send(params);
            messageToUser.textContent = "Submitted, thanks!";
        }
    }
}

let ctrlToolbar = {
    initTreeChart: function() {
        d3.selectAll(".toolbar-button")
            .attr("disabled", null);
        // 🔍 Magnifying buttons control zoom (+/-)
        const duration = 500;
        d3.select("#zoom-in").on("click", () => {
            viewZoom.zoom
                .scaleBy(viewZoom.svg.transition().duration(duration), 1.3);
        });
        d3.select("#zoom-out").on("click", () => {
            viewZoom.zoom
                .scaleBy(viewZoom.svg.transition().duration(duration), 1 / 1.3);
        });
        // 🅰 A+ A- buttons control fontsize
        d3.select("#font-up").on("click", () => {
            let labels = d3.selectAll(".node-label"),
                fontSize = parseInt(labels.style("font-size")),
                maxFontSize = 20;
            if (fontSize < maxFontSize) {
                labels.style("font-size", ++fontSize + "px")
            }
        });
        d3.select("#font-down").on("click", () => {
            let labels = d3.selectAll(".node-label"),
                fontSize = parseInt(labels.style("font-size")),
                minFontSize = 9;
            if (fontSize > minFontSize) {
                labels.style("font-size", --fontSize + "px")
            }
        });
        // ⭕ 🅰 buttons toggle nodes and node-labels respectively
        d3.select("#toggle-node-circles").on("click", () => {
            d3.selectAll(".node")
                .classed("node-normalized", d3.selectAll(".node").classed("node-normalized") ? false : true);
        });
        d3.select("#toggle-node-labels").on("click", () => {
            let labels = d3.selectAll(".node-label"),
                display = labels.style("display");
            
            if (display === "block") {
                labels.style("display", "none");
                viewTreeChart.drawLabels = false;
            } else {
                labels.style("display", "block");
                viewTreeChart.drawLabels = true;
            }
        });
        // Slider controls color based on taxonomic rank (kingdom, phylum, etc ...)
        const slider = d3.select("#slider"),
            colorLabel = d3.select("#color-rank");
        
        slider.attr("disabled", null);
        slider.on("input", () => {
            const { color } = ctrlMain.getHierarchical();
            const { taxonLevelColor, branchColor } = color;
            color.currentRank = parseInt(slider.valueOf()._groups[0][0].value);
            colorLabel.text(color.ranks[color.currentRank]);
            d3.selectAll(".node circle")
                .style("fill", (d) => viewTreeChart.colorNode(d, taxonLevelColor, branchColor))
        });
    },
    initTreemapChart: function () {
        // Disable font and toggle buttons
        d3.selectAll("#toggle-node-circles")
            .attr("disabled", true);
        d3.selectAll(".zoom-button, .font-button, #toggle-node-labels")
            .attr("disabled", null);

        // 🔍 Magnifying buttons control depth of depth of nodes/rectangles
        d3.select("#zoom-in").on("click", () => {
            if (viewStaticTreemapChart.drawDepth < 7) {
                viewStaticTreemapChart.drawDepth++;
                viewStaticTreemapChart.render();
            }
        });
        d3.select("#zoom-out").on("click", () => {
            if (viewStaticTreemapChart.drawDepth > 0) {
              viewStaticTreemapChart.drawDepth--;
              viewStaticTreemapChart.render();
            }
        });
        // 🅰 A+ A- buttons control fontsize
        d3.select("#font-up").on("click", () => {
            let labels = d3.selectAll(".node-label"),
                fontSize = parseInt(labels.style("font-size")),
                maxFontSize = 20;
            if (fontSize < maxFontSize) {
                labels.style("font-size", ++fontSize + "px")
            }
        });
        d3.select("#font-down").on("click", () => {
            let labels = d3.selectAll(".node-label"),
                fontSize = parseInt(labels.style("font-size")),
                minFontSize = 9;
            if (fontSize > minFontSize) {
                labels.style("font-size", --fontSize + "px")
            }
        });
        // 🅰 Toggle node labels
        d3.select("#toggle-node-labels").on("click", () => {
            let labels = d3.selectAll(".node-label"),
                display = labels.style("display");
            
            if (display === "block") {
                labels.style("display", "none");
                viewTreeChart.drawLabels = false;
            } else {
                labels.style("display", "block");
                viewTreeChart.drawLabels = true;
            }
        });
        // Slider controls color based on taxonomic rank (kingdom, phylum, etc ...)
        const slider = d3.select("#slider"),
            colorLabel = d3.select("#color-rank");
        
        slider.attr("disabled", null);
        slider.on("input", () => {
            const { color } = ctrlMain.getHierarchical();
            const { taxonLevelColor, branchColor } = color;
            color.currentRank = parseInt(slider.valueOf()._groups[0][0].value);
            colorLabel.text(color.ranks[color.currentRank]);
            d3.selectAll("rect")
                .style("fill", (d) => viewStaticTreemapChart.colorNode(d, taxonLevelColor, branchColor))
        });
    }
}

let ctrlExportChart = {
    init: function() {
        // Export buttons
        d3.select("#convert-svg").on("click", () => {
            if (! document.querySelector("#chart-display g")) {
                alert("No chart to export!")
            } else {
                // Really hacky, pls rework
                let svgData = document.querySelector("#chart-display").outerHTML.replace("</svg>", "<style>"),
                    sheets = document.styleSheets,
                    style;
                for (let i = 0; i < sheets.length; i++) {
                    if (sheets[i].href && sheets[i].href.match("charts.css")) {style = sheets[i].cssRules || sheet[i].rules;}
                }
                for (let i = 0; i < style.length; i++) {
                    svgData += style[i].cssText;
                }
                svgData += "</style></svg>";
                
                let svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"}),
                    svgUrl = URL.createObjectURL(svgBlob),
                    downloadLink = document.createElement("a");
        
                downloadLink.href = svgUrl;
                downloadLink.download = "visualization.svg";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
        });
    }
}

ctrlMain.init();
