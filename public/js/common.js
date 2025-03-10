//======================================
//       GLOBAL VARS
//======================================
// keep track of col sort
// (in order to save the info in the state)
var lastSortedColumnId;
var colSortDirection;

function initSortDirection() {
   lastSortedColumnId = "";
   colSortDirection  = 1; // 1 for ascending, -1 for descending
}
//======================================
//       STANDALONE/ GENERAL UTILITIES:
//======================================
//-----------------------------------
// function to generate a compressed base64 string from a plain text input
//-----------------------------------
function compressToBase64(inputString) {
   console.log(inputString);
   // 1.3 compress into (Uint8Array)
   const compressedData = pako.deflate(inputString);

   // 2.3 Convert the compressed data (Uint8Array) to a binary string
   let binaryString = '';
   for (let i = 0; i < compressedData.length; i++) {
       binaryString += String.fromCharCode(compressedData[i]);
   }

   // 3.3 Convert the binary string to a Base64 encoded string
   const base64String = btoa(binaryString);

   console.log(`produced base64: [${base64String}]`);
   return base64String;
}

//-----------------------------------
// function to reverse "compressToBase64"
//-----------------------------------
function decompressFromBase64(base64String) {
   // 1.3 Base64 to a binary string
   const binaryString = atob(base64String);

   // 2.3 binary string to a Uint8Array
   const binaryLength = binaryString.length;
   const compressedData = new Uint8Array(binaryLength);
   for (let i = 0; i < binaryLength; i++) {
       compressedData[i] = binaryString.charCodeAt(i);
   }

   // 3.3 Decompress Uint8Array to plain text
   const decompressedData = pako.inflate(compressedData, { to: 'string' });

   return decompressedData;
}

//-----------------------------------
// function to read ALL the url's args
//-----------------------------------
function getAllUrlArgs() {
   const params = new URLSearchParams(window.location.search);
   return params.toString();
}

//-----------------------------------
// function to read the "query" arg value, if present
//-----------------------------------
function getQueryArg() {
   const params = new URLSearchParams(window.location.search);
   return params.get('query') || "";
}

//-----------------------------------
// function to get the "id" of the active Tab
//-----------------------------------
function getActiveTabId() {
   const activeTab = document.querySelector('a.tab-link.active');
   return (activeTab) ? activeTab.id : "";
}
//-----------------------------------
// function to generate a snapshot/state of all NAME & VERSION checkboxes
//-----------------------------------
function generateState(tabState) {
   compressedState = "";
   if (tabState && typeof tabState === 'object') {
      const state = {
         queryArg: getQueryArg(),
         tabId: getActiveTabId(),
         tabState: tabState
      }
      compressedState = compressToBase64(JSON.stringify(state));
   }
   return compressedState;
}
function generateTabState() {
   console.log("generateTabState does nothing. Each tab's.js file should implement its own version");
}
function loadTabFromState(tabId, state) {
   console.log("loadTabFromState does nothing. Each tab's.js file should implement its own version");
}

function generateTabCheckboxesState(classLevel1Checkbox, classLevel2Checkbox) {
   const allCheckboxes = getAllCheckboxes(classLevel1Checkbox, classLevel2Checkbox);
   let checkedIds = ["+"];
   let uncheckedIds = ["-"];

   allCheckboxes.forEach((checkbox) => {
         if (checkbox.checked) {
            checkedIds.push(checkbox.id);
         } else {
            uncheckedIds.push(checkbox.id);
         }
   });

   const tabState = {
      sort: `${lastSortedColumnId},${colSortDirection}`,
      checkboxes:  (checkedIds.length > uncheckedIds.length) ?
                        uncheckedIds.join(',') :
                        checkedIds.join(',')
   };
   return generateState(tabState);
}

function loadTabCheckboxesFromState(tabId, state, classLevel1Checkbox, classLevel2Checkbox, masterCheckboxId) {
   if (state !== undefined && state.tabId === tabId) {
      // get csv values
      const csvValues = state.tabState.checkboxes.split(',');
      console.log(`loading checkboxes state as:${csvValues[0]}`);

      // Get the first value which is either "+" or "-"
      const operation = csvValues[0];

      const checkboxIds = csvValues.slice(1);

      const allCheckboxes = getAllCheckboxes(classLevel1Checkbox, classLevel2Checkbox);
      // Determine the initial state we want to operate on
      const checkedValue = (operation === "+") ? false : true;

      // Init with that state
      allCheckboxes.forEach(checkbox => checkbox.checked = checkedValue);

      // Toggle the state for the checkboxes whose IDs are in the list
      checkboxIds.forEach(id => {
         const checkbox = document.getElementById(id);
         if (checkbox) checkbox.checked = !checkedValue;
      });
      // source sort info
      [lastSortedColumnId, colSortDirection] = state.tabState.sort.split(',');

      // source query info
      // stateQuery = state.queryArg;
   } else {
      setAllCheckboxes(masterCheckboxId);
   }
}



//-----------------------------------
// function to init all NAME & VERSION checkboxes from the received 'state'
//-----------------------------------
function sourceState(compressedState) {

   // let state =  window.shareLinkState;  // coming from Nunjucks
   let jsonState = undefined;
   console.log("loading state:",jsonState);
   if (compressedState) {
      try {
         let state = decompressFromBase64(compressedState);
         jsonState = JSON.parse(state);
         console.log("sourcing state:", state);
      }
      catch (error) {
            console.error(`state string: "${state}" invalid JSON.`, error);
      }
   }
   return jsonState;
}

//======================================
//       ONLOAD / INIT  CODE:
//======================================
//==============================
// Tab area - TABLE (start)
//==============================
//-------------
// init 1 - attach sort handlers to table headers
//-------------
function initTabTable(tableId) {

   const table = document.getElementById(tableId);
   const headers = table.querySelectorAll('.row-header-title');

   if (table) {
      // Init Col Sort
      headers.forEach((header, index) => {
      header.addEventListener('click', (event) => {
         const type = header.getAttribute('data-type');
         const tbody = table.querySelector('tbody');
         const rows = Array.from(tbody.querySelectorAll('tr'));

         rows.sort((a, b) => {
            const cellA = a.children[index].textContent.trim();
            const cellB = b.children[index].textContent.trim();

            if (type === 'number') {
            return (parseFloat(cellA) - parseFloat(cellB)) * colSortDirection;
            } else if (type === 'date') {
            return (new Date(cellA) - new Date(cellB)) * colSortDirection;
            } else {
            return cellA.localeCompare(cellB) * colSortDirection;
            }
         });
         // keep track of last used column-sort
         // note that if there are clicked child elements (e.g. a <span>)
         // within the <th> element, the event.target may not be the <th> element itself
         lastSortedColumnId = event.target.closest('th').id;

         // Toggle sort direction
         colSortDirection *= -1;

         // Re-attach sorted rows to the table
         rows.forEach(row => tbody.appendChild(row));
      });
      });
   }
}
//-------------
// init 2 - attach header <select>s handlers
//-------------
function initHeaderSelects(tableId) {

   document.querySelectorAll(".header-select").forEach(select => {
      select.addEventListener("change", (event) => {
            let table = document.getElementById(tableId);
            let colIndex = Array.from(select.parentElement.parentElement.children).indexOf(select.parentElement);
            let selectedValue = event.target.value.toLowerCase();

            table.querySelectorAll("tbody tr").forEach(row => {
               let cell = row.children[colIndex]; // Get the correct column cell
               let cellValue = cell ? cell.textContent.trim().toLowerCase() : "";

               toggleRow (tableId, row, (selectedValue === "all" || cellValue === selectedValue));
            });
            updateRowStriping(tableId);
      });
   });
}
//-----------------------------------
// function to sort the table by saved state's info
//-----------------------------------
function sortTabTable(lastSortedColumnId) {
      if (lastSortedColumnId) {
         const col = document.getElementById(lastSortedColumnId);
         if (col) {
            col.click();
         }
   }
}

//-------------
// render the table according to the selected checkboxes
//-------------
function filterTableByCheckboxes(tableId) {
   const tableRows = document.querySelectorAll(`#${tableId} tbody tr`);

   tableRows.forEach(row => {
      const level1 = row.getAttribute('data-level1');
      const level2 = row.getAttribute('data-level2');
      // const isLevel1Checked = document.getElementById(level1).checked;
      const isLevel2Checked = document.getElementById(`${level1}-${level2}`).checked;

      // toggleRow (tableId, row, (isLevel1Checked && isLevel2Checked));
      toggleRow (tableId, row, isLevel2Checked);
   });
   updateRowStriping(tableId);
}

//-------------
// update row striping
//-------------
function updateRowStriping(tableId) {
   const tbody = document.querySelector(`#${tableId}`);
   const visibleRows = Array.from(tbody.querySelectorAll("tr:not([style*='display: none'])"));

   visibleRows.forEach((row, index) => {
      if (!row.classList.contains("transparent_row")) {
         row.classList.remove("even_row", "odd_row"); // Remove existing classes
         row.classList.add(index % 2 === 0 ? "odd_row" : "even_row"); // Apply correct class
      }
   });
}

//-------------
// show/hide row
//-------------
function toggleRow(tableId, row, display_on) {
   row.style.display = display_on ? "" : "none";
   updateRowStriping(tableId);
}
//==============================
// Tab area - TABLE (end)
//==============================

//==============================
// Tab area - CHECK BOXES (start)
//==============================
//-------------
// init 3 - attach checkboxes handlers
//-------------
function initMenuCheckBoxes(tableId, masterCheckboxId, level1Class, level2Class) {

   const masterCheckbox = document.getElementById(masterCheckboxId);
   const level1CheckBoxes = document.querySelectorAll(`.${level1Class}`);
   const level2CheckBoxes = document.querySelectorAll(`.${level2Class}`);

   //-------------
   //  3.1 - attach to MASTER - checkbox
   //-------------
   masterCheckbox.addEventListener('change', (event) => {
      const isChecked = event.target.checked;
      level1CheckBoxes.forEach(checkbox => {
         checkbox.checked = isChecked;
      });
      level2CheckBoxes.forEach(checkbox => {
         checkbox.checked = isChecked;
      });
      filterTableByCheckboxes(tableId);
   });
   //-------------
   //  3.2 - attach to Level1 - checkboxes
   //-------------
   level1CheckBoxes.forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
         const level1 = event.target.id;
         const isChecked = event.target.checked;

         document.querySelectorAll(`.${level2Class}[data-level1="${level1}"]`).forEach(vCheckbox => {
               vCheckbox.checked = isChecked;
         });

         filterTableByCheckboxes(tableId);
      });
   });

   //-------------
   //  3.3 - attach to VERSION - checkboxes
   //-------------
   level2CheckBoxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => filterTableByCheckboxes(tableId));
   });
   sortTabTable();
}

//-----------------------------------
// function to get all the level1 & level2 checkboxes
//-----------------------------------
function getAllCheckboxes(level1Class, level2Class) {
   // Select only the checkboxes with the specified classes
   const level1Checkboxes = document.querySelectorAll(`.${level1Class}`);
   const level2Checkboxes = document.querySelectorAll(`.${level2Class}`);

   // Combine into 1 array
   return [...level1Checkboxes, ...level2Checkboxes];
}
//-----------------------------------
// function to set 'checked' all level1 & level2 checkboxes
//-----------------------------------
function setAllCheckboxes(masterCheckboxId) {
   const masterCheckbox = document.getElementById(masterCheckboxId);
   masterCheckbox.checked = true;
   const event = new Event('change');
   masterCheckbox.dispatchEvent(event);
}
//==============================
// Tab area - CHECK BOXES (end)
//==============================

//==============================
// share BUTTON (start)
//==============================

//-----------------------------------
// init 4 - Add handler to (share/create link)-BUTTON
//-----------------------------------
function initShareButton() {
   document.getElementById('button-share').addEventListener('click', async () => {
      try {
         const base64State = window.currentTab.generateTabState();    // this is implemented in each tab's .js
         if (base64State) {
            const response = await fetch('/dashboard', {
               method: 'POST',
               headers: {
                  'Content-Type': 'text/plain'
               },
               body: base64State
            });

            if (response.ok) {
               const linkId = await response.text();
               const currentUrl = window.location.href;
               // Get the base URL without query parameters
               const baseUrl = window.location.origin + window.location.pathname;
               const shareUrl = `${baseUrl}?linkid=${encodeURIComponent(linkId)}`;
               console.log(shareUrl);
               navigator.clipboard.writeText(shareUrl);
               showShareResponse('link copied to clipboard', 'ok');
            } else {
               showShareResponse('Error creating link', 'error');
            }
         }
      } catch (error) {
         showShareResponse('Error creating link', 'error');
      }
   });
}

//-----------------------------------
// function to show the response's result of share-link button
//-----------------------------------
function showShareResponse(message, type) {
   const statusMessage = document.getElementById('share-status-message');
   const statusIcon    = document.getElementById('share-status-icon');
   const statusText    = document.getElementById('share-status-text');

   statusText.textContent = message;
   if (type === 'ok') {
       statusMessage.className = 'ok';
       statusIcon.textContent = '✅';
   } else {
       statusMessage.className = 'error';
       statusIcon.textContent = '❌';
   }
   // Show the message
   statusMessage.style.display = 'block';

   // Hide the message after 2 seconds
   setTimeout(() => {
       statusMessage.style.display = 'none';
   }, 2000);
}
//==============================
// share BUTTON (end)
//==============================

