document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const addPartBtn = document.getElementById('add-part-btn');
    const partsListDiv = document.getElementById('parts-list');
    const calculateBtn = document.getElementById('calculate-btn');
    const optimizerForm = document.getElementById('optimizer-form');
    const resultsSummaryDiv = document.getElementById('results-summary');
    const resultsLayoutsDiv = document.getElementById('results-layouts');
    const layoutsPlaceholder = document.getElementById('layouts-placeholder');
    const sheetWidthInput = document.getElementById('sheet-width');
    const sheetHeightInput = document.getElementById('sheet-height');
    const kerfWidthInput = document.getElementById('kerf-width');
    const unitToggle = document.getElementById('unit-toggle'); // Get toggle switch

    // --- Unit System State & Constants ---
    let currentUnitSystem = 'metric'; // 'metric' or 'imperial'
    const INCH_TO_MM = 25.4;
    const MM_TO_INCH = 1 / INCH_TO_MM;
    const SQMM_TO_SQIN = MM_TO_INCH * MM_TO_INCH;
    const SQMM_TO_SQFT = SQMM_TO_SQIN / 144; // Square feet

    // --- Event Listeners ---
    addPartBtn.addEventListener('click', addPartRow);
    partsListDiv.addEventListener('click', handlePartListClick);
    calculateBtn.addEventListener('click', handleCalculation);
    optimizerForm.addEventListener('reset', handleFormReset);
    unitToggle.addEventListener('change', handleUnitChange); // Listener for toggle

    // --- Initial Setup ---
    updateUnitsUI(); // Set initial UI based on default unit system
    layoutsPlaceholder.style.display = 'block';

    // --- Unit System Handling ---
    function handleUnitChange() {
        currentUnitSystem = unitToggle.checked ? 'imperial' : 'metric';
        console.log("Unit system changed to:", currentUnitSystem);
        updateUnitsUI();
        // Optional: Consider clearing results or warning user about input values
        // clearPreviousResults();
        // alert("Units changed. Input values may need adjustment.");
    }

    function updateUnitsUI() {
        const unitLabel = currentUnitSystem === 'imperial' ? 'in' : 'mm';
        // Choose area unit: ft² for imperial, mm² for metric
        const areaUnitLabel = currentUnitSystem === 'imperial' ? 'ft²' : 'mm²';
        const kerfPlaceholder = currentUnitSystem === 'imperial' ? 'e.g., 0.125' : 'e.g., 3';
        const sheetWPlaceholder = currentUnitSystem === 'imperial' ? 'e.g., 48' : 'e.g., 1220';
        const sheetHPlaceholder = currentUnitSystem === 'imperial' ? 'e.g., 96' : 'e.g., 2440';

        // Update all unit labels next to dimension inputs
        document.querySelectorAll('.unit-label').forEach(span => {
            span.textContent = unitLabel;
        });

        // Update summary area unit labels
        document.querySelectorAll('#summary-area-unit').forEach(span => {
             span.textContent = areaUnitLabel;
        });

        // Update placeholders
        sheetWidthInput.placeholder = sheetWPlaceholder;
        sheetHeightInput.placeholder = sheetHPlaceholder;
        kerfWidthInput.placeholder = kerfPlaceholder;
        partsListDiv.querySelectorAll('.part-row').forEach(row => {
             row.querySelector('.part-width').placeholder = 'Width';
             row.querySelector('.part-height').placeholder = 'Height';
        });

        // Update default kerf value intelligently if it's a common default or empty
        const currentKerf = kerfWidthInput.value.trim();
        if (currentKerf === '' || currentKerf === "3" || currentKerf === "0.125") {
             kerfWidthInput.value = currentUnitSystem === 'imperial' ? '0.125' : '3';
        }
    }

    // --- Add/Remove Part Functions ---
    function addPartRow() {
        const existingPartRows = partsListDiv.querySelectorAll('.part-row');
        const templateRow = existingPartRows[existingPartRows.length - 1];
        if (!templateRow) return; // Should not happen

        const newPartRow = templateRow.cloneNode(true);

        // Clear input values and validation styles
        newPartRow.querySelectorAll('input').forEach(input => {
            input.value = input.classList.contains('part-quantity') ? '1' : '';
            input.classList.remove('invalid-input', 'warning-input');
        });

        // Set correct unit label and placeholders for the new row
        const unitLabel = currentUnitSystem === 'imperial' ? 'in' : 'mm';
        newPartRow.querySelectorAll('.unit-label').forEach(span => {
            span.textContent = unitLabel;
        });
        newPartRow.querySelector('.part-width').placeholder = 'Width';
        newPartRow.querySelector('.part-height').placeholder = 'Height';

        partsListDiv.appendChild(newPartRow);
    }

    function handlePartListClick(event) {
        if (event.target.classList.contains('remove-part-btn')) {
            const partRow = event.target.closest('.part-row');
            if (partsListDiv.querySelectorAll('.part-row').length > 1) {
                partRow.remove();
            } else {
                alert("You must have at least one part.");
            }
        }
    }

    // --- Calculation Handling ---
    function handleCalculation() {
        console.log("Calculate button clicked");
        clearPreviousResults();

        // 1. Gather, Validate & Convert Input
        const { sheetWidthMM, sheetHeightMM, kerfWidthMM, partsMM, originalParts, isValid } = gatherAndValidateInputs();

        if (!isValid) return; // Validation failed, message shown by gatherAndValidateInputs

        // --- 2. Call the Optimization Algorithm (Uses MM) ---
        console.log("Running optimization with MM values:", { sheetWidthMM, sheetHeightMM, kerfWidthMM, partsMM });
        layoutsPlaceholder.textContent = "Calculating...";
        layoutsPlaceholder.style.display = 'block';

        // Use setTimeout to allow UI update before potentially long calculation
        setTimeout(() => {
            try {
                // Pass MM values to the packer
                const optimizationResult = shelfPacker(sheetWidthMM, sheetHeightMM, kerfWidthMM, partsMM);
                console.log("Optimization Result:", optimizationResult);

                // --- 3. Display Results (Convert back for display if needed) ---
                 if (optimizationResult.layouts.length === 0 && optimizationResult.unplacedParts.length > 0) {
                    alert(`Could not place any parts. The smallest part might be too large for the sheet, or there's an issue. Unplaced: ${optimizationResult.unplacedParts.length}`);
                    layoutsPlaceholder.textContent = "Could not generate layout.";
                } else if (optimizationResult.unplacedParts.length > 0) {
                     alert(`Warning: Could not place ${optimizationResult.unplacedParts.length} part(s). They might be too large or there wasn't enough space. Check console for details.`);
                     console.warn("Unplaced parts:", optimizationResult.unplacedParts);
                }

                // Pass MM results and original parts data for display formatting
                displaySummary(optimizationResult.summary, sheetWidthMM, sheetHeightMM);
                displayLayouts(optimizationResult.layouts, sheetWidthMM, sheetHeightMM, originalParts);

            } catch (error) {
                console.error("Error during optimization:", error);
                alert(`An error occurred during calculation: ${error.message}. Check console.`);
                layoutsPlaceholder.textContent = "Calculation Error!";
            }
        }, 50); // Small delay for UI update
    }

    function gatherAndValidateInputs() {
        let isValid = true;

        // Clear previous validation states
        sheetWidthInput.classList.remove('invalid-input');
        sheetHeightInput.classList.remove('invalid-input');
        kerfWidthInput.classList.remove('invalid-input');
        partsListDiv.querySelectorAll('input').forEach(el => el.classList.remove('invalid-input', 'warning-input'));

        // Get raw sheet values
        const sheetWidthRaw = parseFloat(sheetWidthInput.value);
        const sheetHeightRaw = parseFloat(sheetHeightInput.value);
        const kerfWidthRaw = parseFloat(kerfWidthInput.value);

        // Validate raw sheet values
        if (isNaN(sheetWidthRaw) || sheetWidthRaw <= 0) { sheetWidthInput.classList.add('invalid-input'); isValid = false; }
        if (isNaN(sheetHeightRaw) || sheetHeightRaw <= 0) { sheetHeightInput.classList.add('invalid-input'); isValid = false; }
        if (isNaN(kerfWidthRaw) || kerfWidthRaw < 0) { kerfWidthInput.classList.add('invalid-input'); isValid = false; }

        if (!isValid) {
            alert("Please enter valid sheet dimensions and kerf width.");
            return { isValid: false };
        }

        // Convert sheet dimensions to MM (internal standard)
        const sheetWidthMM = currentUnitSystem === 'imperial' ? sheetWidthRaw * INCH_TO_MM : sheetWidthRaw;
        const sheetHeightMM = currentUnitSystem === 'imperial' ? sheetHeightRaw * INCH_TO_MM : sheetHeightRaw;
        const kerfWidthMM = currentUnitSystem === 'imperial' ? kerfWidthRaw * INCH_TO_MM : kerfWidthRaw;

        const originalParts = []; // Holds original input values for display
        const partsMM = [];       // Holds MM converted values for the algorithm
        const partRows = partsListDiv.querySelectorAll('.part-row');
        let partInputValid = true;

        partRows.forEach((row, index) => {
            const widthInput = row.querySelector('.part-width');
            const heightInput = row.querySelector('.part-height');
            const quantityInput = row.querySelector('.part-quantity');

            const widthRaw = parseFloat(widthInput.value);
            const heightRaw = parseFloat(heightInput.value);
            const quantity = parseInt(quantityInput.value, 10);

            let rowIsValid = true;
            if (isNaN(widthRaw) || widthRaw <= 0) { widthInput.classList.add('invalid-input'); rowIsValid = false; }
            if (isNaN(heightRaw) || heightRaw <= 0) { heightInput.classList.add('invalid-input'); rowIsValid = false; }
            if (isNaN(quantity) || quantity <= 0) { quantityInput.classList.add('invalid-input'); rowIsValid = false; }

            if (rowIsValid) {
                // Convert part dimensions to MM
                const widthMM = currentUnitSystem === 'imperial' ? widthRaw * INCH_TO_MM : widthRaw;
                const heightMM = currentUnitSystem === 'imperial' ? heightRaw * INCH_TO_MM : heightRaw;

                // Basic check if part fits sheet (using MM values, simple check)
                const fitsNormally = (widthMM <= sheetWidthMM && heightMM <= sheetHeightMM);
                const fitsRotated = (heightMM <= sheetWidthMM && widthMM <= sheetHeightMM);
                if (!fitsNormally && !fitsRotated) {
                    widthInput.classList.add('warning-input');
                    heightInput.classList.add('warning-input');
                    console.warn(`Part ${index + 1} (${widthRaw}x${heightRaw} ${currentUnitSystem}) seems too large for the sheet (${sheetWidthRaw}x${sheetHeightRaw} ${currentUnitSystem}).`);
                    // Allow calculation to proceed, packer will handle unplaceable parts
                }

                const partId = `part_${index}_${Date.now()}`;
                originalParts.push({
                   id: partId,
                   originalWidth: widthRaw,
                   originalHeight: heightRaw,
                   quantity: quantity,
                });

                partsMM.push({
                   id: partId, // Use the same ID
                   width: widthMM,
                   height: heightMM,
                   quantity: quantity,
                   area: widthMM * heightMM // Area in mm^2
                });

            } else {
                partInputValid = false; // Mark overall input as invalid if any row fails
            }
        });

        if (!partInputValid) {
            alert("Please correct the highlighted errors in the parts list.");
            isValid = false;
        }
        if (partsMM.length === 0 && isValid) { // Check partsMM as that's used for calculation
            alert("Please add at least one valid part to cut.");
            isValid = false;
        }

        return { sheetWidthMM, sheetHeightMM, kerfWidthMM, partsMM, originalParts, isValid };
    }


    // --- Shelf Packing Algorithm (Shelf FFDH) ---
    // This function and its helpers work internally with MM units
    function shelfPacker(sheetW, sheetH, kerf, partsInput) {
        // 1. Prepare and Sort Parts (MM units)
        let allParts = [];
        partsInput.forEach(p => {
            for (let i = 0; i < p.quantity; i++) {
                // Add instance ID for tracking if needed, ensure width/height are MM
                allParts.push({ ...p, originalId: p.id, instanceId: `${p.id}_${i}` });
            }
        });

        // Sort by Height (desc), then Width (desc) - Using MM dimensions
        allParts.sort((a, b) => b.height - a.height || b.width - a.width);

        let layouts = [];
        let currentSheet = null;
        let unplacedParts = [];

        function createNewSheet(index) {
            return {
                sheetIndex: index,
                placedParts: [],
                shelves: [], // Each shelf: { y, height, currentX } (all in MM)
                nextShelfY: kerf // Where the bottom of the next shelf starts (MM)
            };
        }

        // 2. Iterate through sorted parts (MM units)
        for (const part of allParts) { // part dimensions are in MM
            let placed = false;

            if (!currentSheet) {
                 currentSheet = createNewSheet(layouts.length);
                 if (!canPartFitSheet(part, sheetW, sheetH, kerf)) { // Checks MM part against MM sheet
                     console.error(`Part ${part.width.toFixed(1)}x${part.height.toFixed(1)}mm is too large for the ${sheetW.toFixed(1)}x${sheetH.toFixed(1)}mm sheet.`);
                     unplacedParts.push(part); // Store the MM part object
                     continue;
                 }
            }

            // 3. Try placing on the current sheet (all checks use MM)
            for (const shelf of currentSheet.shelves) { // shelf dimensions are in MM
                 // Try no rotation (part dimensions are MM)
                 if (part.height <= shelf.height && shelf.currentX + part.width <= sheetW - kerf / 2) {
                     placePartOnShelf(currentSheet, shelf, part, false, kerf); // Pass MM part
                     placed = true; break;
                 }
                 // Try rotation (part dimensions are MM)
                 if (part.width <= shelf.height && shelf.currentX + part.height <= sheetW - kerf / 2) {
                     placePartOnShelf(currentSheet, shelf, part, true, kerf); // Pass MM part
                     placed = true; break;
                 }
            }

            // Try a new shelf if not placed (all checks use MM)
            if (!placed) {
                // Try no rotation
                if (currentSheet.nextShelfY + part.height <= sheetH - kerf / 2 && kerf + part.width <= sheetW - kerf / 2) {
                    createNewShelfAndPlace(currentSheet, part, false, sheetW, kerf); // Pass MM part
                    placed = true;
                }
                // Try rotation
                else if (currentSheet.nextShelfY + part.width <= sheetH - kerf / 2 && kerf + part.height <= sheetW - kerf / 2) {
                    createNewShelfAndPlace(currentSheet, part, true, sheetW, kerf); // Pass MM part
                    placed = true;
                }
            }

            // Needs a new sheet if still not placed
            if (!placed) {
                 if (!canPartFitSheet(part, sheetW, sheetH, kerf)) { // Check MM part against MM sheet
                      console.warn(`Part ${part.width.toFixed(1)}x${part.height.toFixed(1)}mm cannot fit on a new sheet.`);
                      unplacedParts.push(part); // Store MM part
                      continue;
                 }

                 if (currentSheet.placedParts.length > 0) {
                     layouts.push(finalizeSheet(currentSheet, sheetW, sheetH, kerf)); // Pass MM dimensions
                 }
                 currentSheet = createNewSheet(layouts.length);

                 // Place on new sheet (must fit) - all checks use MM
                 if (kerf + part.width <= sheetW - kerf / 2 && currentSheet.nextShelfY + part.height <= sheetH - kerf / 2) {
                     createNewShelfAndPlace(currentSheet, part, false, sheetW, kerf);
                 } else if (kerf + part.height <= sheetW - kerf / 2 && currentSheet.nextShelfY + part.width <= sheetH - kerf / 2) {
                     createNewShelfAndPlace(currentSheet, part, true, sheetW, kerf);
                 } else {
                     console.error("Logical error: Part should have fit on new sheet but failed placement.");
                     unplacedParts.push(part); // Store MM part
                 }
            }
        } // End loop through parts

        if (currentSheet && currentSheet.placedParts.length > 0) {
            layouts.push(finalizeSheet(currentSheet, sheetW, sheetH, kerf)); // Pass MM dimensions
        }

        // 4. Calculate Summary (using MM areas)
        let totalPartAreaPlaced = 0; // in mm^2
        layouts.forEach(layout => {
            layout.placedParts.forEach(p => {
                totalPartAreaPlaced += p.w * p.h; // w, h are placed dimensions in MM
            });
        });

        const sheetsNeeded = layouts.length;
        const sheetArea = sheetW * sheetH; // mm^2
        const totalSheetArea = sheetsNeeded * sheetArea; // mm^2
        const totalWasteArea = totalSheetArea - totalPartAreaPlaced; // mm^2
        const wastePercent = totalSheetArea > 0 ? (totalWasteArea / totalSheetArea) * 100 : 0;

        return {
            summary: { // All area values are in mm^2
                sheetsNeeded: sheetsNeeded,
                totalAreaUsed: totalPartAreaPlaced,
                totalWasteArea: totalWasteArea,
                wastePercent: wastePercent.toFixed(2),
            },
            layouts: layouts, // Layout coordinates and dimensions are in MM
            unplacedParts: unplacedParts // Unplaced parts objects are MM versions
        };
    }

    // --- Helper Functions for Shelf Packer (Input/Output in MM) ---
    function canPartFitSheet(part, sheetW, sheetH, kerf) { // Expects MM values
        // Add small tolerance for floating point comparisons
        const tolerance = 1e-6;
        const fitsNormal = (part.width <= sheetW - 2 * kerf + tolerance && part.height <= sheetH - 2 * kerf + tolerance);
        const fitsRotated = (part.height <= sheetW - 2 * kerf + tolerance && part.width <= sheetH - 2 * kerf + tolerance);
        return fitsNormal || fitsRotated;
    }

    function placePartOnShelf(sheet, shelf, part, rotated, kerf) { // Expects MM values
        const placeW = rotated ? part.height : part.width; // MM
        const placeH = rotated ? part.width : part.height; // MM
        sheet.placedParts.push({
            part: part, // Reference to MM part data
            x: shelf.currentX, // MM
            y: shelf.y,        // MM
            w: placeW,         // MM
            h: placeH,         // MM
            rotated: rotated
        });
        shelf.currentX += placeW + kerf; // Update shelf position in MM
    }

    function createNewShelfAndPlace(sheet, part, rotated, sheetW, kerf) { // Expects MM values
        const placeW = rotated ? part.height : part.width; // MM
        const placeH = rotated ? part.width : part.height; // MM
        const shelfY = sheet.nextShelfY; // MM
        const shelfH = placeH;          // MM

        const newShelf = {
            y: shelfY,           // MM
            height: shelfH,      // MM
            currentX: kerf + placeW + kerf // MM
        };
        sheet.shelves.push(newShelf);
        sheet.placedParts.push({
            part: part, // Reference to MM part data
            x: kerf,    // MM
            y: shelfY,  // MM
            w: placeW,  // MM
            h: placeH,  // MM
            rotated: rotated
        });
        sheet.nextShelfY += shelfH + kerf; // Update next shelf Y position in MM
    }

     function finalizeSheet(sheet, sheetW, sheetH, kerf) { // Expects MM values
         sheet.wasteRects = calculateShelfWaste(sheet, sheetW, sheetH, kerf); // Calculate waste in MM
         return sheet;
     }

     function calculateShelfWaste(sheet, sheetW, sheetH, kerf) { // Expects MM values
         const wasteRects = []; // Dimensions will be in MM
         sheet.shelves.forEach(shelf => {
             if (shelf.currentX < sheetW - kerf / 2) {
                 wasteRects.push({
                     x: shelf.currentX,
                     y: shelf.y,
                     w: sheetW - shelf.currentX - kerf / 2,
                     h: shelf.height
                 });
             }
         });
         if (sheet.nextShelfY < sheetH - kerf / 2) {
              wasteRects.push({
                  x: 0,
                  y: sheet.nextShelfY,
                  w: sheetW,
                  h: sheetH - sheet.nextShelfY - kerf / 2
              });
         }
         return wasteRects;
     }


    // --- Display Functions (Handle Unit Conversion for Output) ---
    function displaySummary(summary, sheetW_MM, sheetH_MM) { // summary areas are in mm^2
        const sheetsNeeded = summary.sheetsNeeded;
        const totalAreaUsedMM2 = summary.totalAreaUsed;
        const totalWasteAreaMM2 = summary.totalWasteArea;
        let displayAreaUsed, displayWasteArea, displayAreaUnit;

        if (currentUnitSystem === 'imperial') {
            // Convert mm^2 to ft^2 for display
            displayAreaUsed = (totalAreaUsedMM2 * SQMM_TO_SQFT).toFixed(2);
            displayWasteArea = (totalWasteAreaMM2 * SQMM_TO_SQFT).toFixed(2);
            displayAreaUnit = 'ft²';
        } else {
            // Display mm^2 (use locale string for readability)
            displayAreaUsed = Math.round(totalAreaUsedMM2).toLocaleString();
            displayWasteArea = Math.round(totalWasteAreaMM2).toLocaleString();
            displayAreaUnit = 'mm²';
        }

        document.getElementById('summary-sheets').textContent = sheetsNeeded;
        document.getElementById('summary-area-used').textContent = displayAreaUsed;
        document.getElementById('summary-waste-area').textContent = displayWasteArea;
        document.querySelectorAll('#summary-area-unit').forEach(span => span.textContent = displayAreaUnit);
        document.getElementById('summary-waste-percent').textContent = summary.wastePercent;
    }

    // Receives layout in MM, sheet dims in MM, originalParts for labels
    function displayLayouts(layouts, sheetWidthMM, sheetHeightMM, originalPartsInput) {
        resultsLayoutsDiv.innerHTML = '<h3>Layouts</h3>'; // Clear previous

        if (!layouts || layouts.length === 0) {
            resultsLayoutsDiv.appendChild(layoutsPlaceholder);
            if (layoutsPlaceholder.textContent === "Calculating...") {
                 layoutsPlaceholder.textContent = "No valid layout generated.";
            }
            layoutsPlaceholder.style.display = 'block';
            return;
        }
        layoutsPlaceholder.style.display = 'none';

        // Visual scaling based on MM dimensions
        const displayMaxWidth = Math.min(resultsLayoutsDiv.clientWidth - 40, 700);
        const scale = displayMaxWidth / sheetWidthMM;
        const displaySheetW = sheetWidthMM * scale;
        const displaySheetH = sheetHeightMM * scale;

        // Create a map for quick lookup of original part data by ID
        const originalPartMap = new Map(originalPartsInput.map(p => [p.id, p]));

        layouts.forEach((sheetLayout) => { // sheetLayout coordinates/dims are in MM
            const sheetContainer = document.createElement('div');
            sheetContainer.className = 'layout-container';
            const sheetTitle = document.createElement('h4');
            sheetTitle.className = 'layout-title';
            sheetTitle.textContent = `Sheet ${sheetLayout.sheetIndex + 1}`;
            sheetContainer.appendChild(sheetTitle);

            const sheetDiv = document.createElement('div');
            sheetDiv.className = 'layout-sheet';
            sheetDiv.style.width = `${displaySheetW}px`;
            sheetDiv.style.height = `${displaySheetH}px`;

            // Draw placed parts
            sheetLayout.placedParts.forEach(placed => { // placed dimensions/coords are in MM
                const partDiv = document.createElement('div');
                partDiv.className = 'layout-part';
                // Scale MM coordinates/dimensions for display
                partDiv.style.left = `${placed.x * scale}px`;
                partDiv.style.top = `${placed.y * scale}px`;
                partDiv.style.width = `${placed.w * scale}px`;
                partDiv.style.height = `${placed.h * scale}px`;

                // Get original dimensions (user input units) for label/tooltip
                const originalPartData = originalPartMap.get(placed.part.originalId); // Lookup by original ID
                const displayWidth = originalPartData ? originalPartData.originalWidth : '?'; // Fallback
                const displayHeight = originalPartData ? originalPartData.originalHeight : '?'; // Fallback

                // Convert MM position to display units for tooltip
                const displayX = (placed.x * (currentUnitSystem === 'imperial' ? MM_TO_INCH : 1)).toFixed(1);
                const displayY = (placed.y * (currentUnitSystem === 'imperial' ? MM_TO_INCH : 1)).toFixed(1);
                const unitLabel = currentUnitSystem === 'imperial' ? 'in' : 'mm';

                partDiv.title = `Part: ${displayWidth}x${displayHeight} ${unitLabel}\nPos: (${displayX}, ${displayY}) ${unitLabel} ${placed.rotated ? '(R)' : ''}`;

                // Add text label if part is large enough on screen
                const placedAreaOnScreen = (placed.w * scale) * (placed.h * scale);
                 if (placedAreaOnScreen > 350) { // Adjust threshold as needed
                     partDiv.textContent = `${displayWidth}x${displayHeight}${placed.rotated ? ' R' : ''}`;
                     if(placed.rotated) partDiv.classList.add('rotated');
                 }
                sheetDiv.appendChild(partDiv);
            });

            // Draw waste rectangles (optional)
            sheetLayout.wasteRects?.forEach(waste => { // waste dimensions/coords are in MM
                const wasteDiv = document.createElement('div');
                wasteDiv.className = 'layout-waste';
                 const wasteW_scaled = Math.max(0, waste.w * scale);
                 const wasteH_scaled = Math.max(0, waste.h * scale);
                 if (wasteW_scaled > 0.1 && wasteH_scaled > 0.1) { // Avoid rendering tiny slivers
                     wasteDiv.style.left = `${waste.x * scale}px`;
                     wasteDiv.style.top = `${waste.y * scale}px`;
                     wasteDiv.style.width = `${wasteW_scaled}px`;
                     wasteDiv.style.height = `${wasteH_scaled}px`;

                     // Tooltip showing waste dimensions in current display units
                     const wasteWDisplay = (waste.w * (currentUnitSystem === 'imperial' ? MM_TO_INCH : 1)).toFixed(1);
                     const wasteHDisplay = (waste.h * (currentUnitSystem === 'imperial' ? MM_TO_INCH : 1)).toFixed(1);
                     const unitLabel = currentUnitSystem === 'imperial' ? 'in' : 'mm';
                     wasteDiv.title = `Waste Area: ${wasteWDisplay}x${wasteHDisplay} ${unitLabel}`;

                     sheetDiv.appendChild(wasteDiv);
                 }
            });

            sheetContainer.appendChild(sheetDiv);
            resultsLayoutsDiv.appendChild(sheetContainer);
        });
    }

    // --- Reset & Clear Functions ---
    function clearPreviousResults() {
        // Clear summary text
        document.getElementById('summary-sheets').textContent = '--';
        document.getElementById('summary-area-used').textContent = '--';
        document.getElementById('summary-waste-area').textContent = '--';
        document.getElementById('summary-waste-percent').textContent = '--';
        // Reset area unit label based on current setting (or default to metric)
        const areaUnitLabel = currentUnitSystem === 'imperial' ? 'ft²' : 'mm²';
        document.querySelectorAll('#summary-area-unit').forEach(span => span.textContent = areaUnitLabel);


        // Clear layouts visualization
        resultsLayoutsDiv.innerHTML = '<h3>Layouts</h3>';
        resultsLayoutsDiv.appendChild(layoutsPlaceholder);
        layoutsPlaceholder.textContent = "Layouts will appear here after calculation...";
        layoutsPlaceholder.style.display = 'block';

        // Clear validation styles from form inputs
        optimizerForm.querySelectorAll('.invalid-input, .warning-input').forEach(el => {
            el.classList.remove('invalid-input', 'warning-input');
        });
    }

    function handleFormReset(event) {
        // Use a small delay to allow the native browser reset to clear input values first
        setTimeout(() => {
            console.log("Form reset initiated");

            // Remove extra part rows, leaving only one clean row
            const allPartRows = partsListDiv.querySelectorAll('.part-row');
            allPartRows.forEach((row, index) => {
                if (index > 0) {
                    row.remove();
                } else {
                    // Ensure the first row quantity is 1 and inputs/styles are reset
                     row.querySelector('.part-quantity').value = '1';
                     row.querySelectorAll('input').forEach(input => {
                         input.classList.remove('invalid-input', 'warning-input');
                         // Native reset should clear width/height, but ensure quantity is 1
                     });
                }
            });

            // Reset toggle switch to unchecked (metric) state
            unitToggle.checked = false;
            currentUnitSystem = 'metric'; // Explicitly set state variable

            // Update UI elements (labels, placeholders, default kerf) to metric
            updateUnitsUI();

            // Clear any previous calculation results
            clearPreviousResults(); // Call this *after* setting units back to metric

            console.log("Form reset complete, units set to metric.");
        }, 0); // Timeout 0 allows browser event queue to process native reset first
    }

}); // End DOMContentLoaded