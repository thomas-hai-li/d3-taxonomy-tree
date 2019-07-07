let viewZoom = {
    init: function() {
        this.svg = d3.select("#chart-display");
    },
    render: function(type) {
        this.zoom = d3.zoom()
                .scaleExtent([0.4, 10])
                .on("zoom", zoomed);
        const chart = d3.select("#chart");
    
        function zoomed() {
            const transform = d3.event.transform;

            // scale nodes
            chart.selectAll(".node").attr("transform", d => {
                if (type === "radial-tree") {
                    return "translate(" + transform.apply(viewTreeChart.project(d.x, d.y)) + ")";
                }
                return "translate(" + transform.applyX(d.y) + "," + transform.applyY(d.x) + ")";
            });
            // scale links
            chart.selectAll(".link").attr("d", d => {
                if (type === "radial-tree") {
                    return "M" + transform.apply(viewTreeChart.project(d.x, d.y))
                    + "C" + transform.apply(viewTreeChart.project(d.x, (d.y + d.parent.y) / 2))
                    + " " + transform.apply(viewTreeChart.project(d.parent.x, (d.y + d.parent.y) / 2))
                    + " " + transform.apply(viewTreeChart.project(d.parent.x, d.parent.y));
                }
                return "M" + transform.applyX(d.y) + "," + transform.applyY(d.x)
                    + "C" + (transform.applyX(d.y) + transform.applyX(d.parent.y)) / 2 + "," + transform.applyY(d.x)
                    + " " + (transform.applyX(d.y) + transform.applyX(d.parent.y)) / 2 + "," + transform.applyY(d.parent.x)
                    + " " + transform.applyX(d.parent.y) + "," + transform.applyY(d.parent.x);
            });
        }
        this.svg.call(this.zoom);
    }
}

// let viewBrush = {
//     init: function() {
//         this.svg = d3.select("#chart-display");
//     },
//     render: function() {
//         this.brush = d3.brush()
//             .on("start", () => {
//                 if (! d3.event.sourceEvent.shiftKey) {
//                     console.log(this.svg)
//                     brush.move(this.svg, null)  // ?????
//                 }
//             })
//             .on("brush", function() {
//                 // Disable panning
//                 viewZoom.svg.call(viewZoom.zoom.on("zoom", null));
//                 if (d3.event.sourceEvent.shiftKey) {
//                     let coords = d3.event.selection;
//                     d3.selectAll(".node circle")
//                         .classed("selected", d => {
//                             let x = d.x,
//                                 y = d.y;
//                             return viewBrush.isSelected(coords, x, y);
//                     });
//                 }
//                 else {
//                     viewBrush.svg.on(".brush", null);
//                 }
//             });
//         viewBrush.svg.append("g")
//             .attr("class", "brush")
//             .call(this.brush);
//     },
//     isSelected: function (coords, x, y) {
//         let x0 = coords[0][0],
//             x1 = coords[1][0],
//             y0 = coords[0][1],
//             y1 = coords[1][1];

//         return x0 <= x && x <= x1 && y0 <= y && y <= y1;
//     }
// }
