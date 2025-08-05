'use strict';

// This function is the entry point for your extension.
// It runs when the HTML document is fully loaded.
$(document).ready(function () {
    // This method call establishes the connection between your extension and Tableau.
    // The .then() block runs once the connection is successful.
    tableau.extensions.initializeAsync().then(function () {
        // All of our main logic will go in here.
        console.log("Extension successfully initialized!");
        
        // Let's populate the worksheet dropdown now.
        populateWorksheetDropdown();
        
        // And attach the export function to the button click event.
        $('#export-button').click(function () {
            exportGeoJSON();
        });
    });
});

// This function gets all the worksheets and adds them to the dropdown.
function populateWorksheetDropdown() {
    const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
    let worksheetSelect = $('#worksheet-select');
    worksheets.forEach(function (worksheet) {
        worksheetSelect.append($('<option>', {
            value: worksheet.name,
            text: worksheet.name
        }));
    });
}

// This function gets the data and formats it as GeoJSON.
function exportGeoJSON() {
    const selectedWorksheetName = $('#worksheet-select').val();
    const worksheet = tableau.extensions.dashboardContent.dashboard.worksheets.find(
        ws => ws.name === selectedWorksheetName
    );

    if (worksheet) {
        // Get the summary data from the selected worksheet.
        worksheet.getSummaryDataAsync().then(function (dataTable) {
            const columns = dataTable.columns;
            const data = dataTable.data;

            // Find the indices of the latitude and longitude columns.
            // const latIndex = columns.findIndex(col => col.fieldName.toLowerCase().includes('latitude'));
            // const lonIndex = columns.findIndex(col => col.fieldName.toLowerCase().includes('longitude'));
            const shapeGpsIndex = columns.findIndex(col => col.fieldName.toLowerCase().includes('shape gps polygon json'));

            if (shapeGpsIndex === -1) {
                alert("Shape GPS column not found in the selected worksheet.");
                return;
            }

            const geojson = {
                type: 'FeatureCollection',
                features: []
            };

            data.forEach(function (row) {
                // const latitude = parseFloat(row[latIndex].value);
                // const longitude = parseFloat(row[lonIndex].value);
                const shapeGps = JSON.parse(row[shapeGpsIndex].value); 

                if (isNaN(shapeGps)) {
                    return;
                }

                // Construct the properties object for the feature.
                const properties = {};
                columns.forEach(function (col, index) {
                    if (index !== shapeGpsIndex) {
                        properties[col.fieldName] = row[index].value;
                    }
                });

                // Construct the GeoJSON Feature.
                const feature = {
                    type: 'Feature',
                    geometry: {
                        type: shapeGps['type'],
                        coordinates: shapeGps['coordinates'] // GeoJSON uses [longitude, latitude]
                    },
                    properties: properties
                };
                geojson.features.push(feature);
            });

            const geojsonString = JSON.stringify(geojson, null, 2);

            downloadFile(geojsonString, 'exported_data.geojson', 'application/json');
        });
    } else {
        alert("Please select a worksheet.");
    }
}

// This function creates and triggers a file download from a string.
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}