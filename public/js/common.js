//======================================
//       GLOBAL VARS
//======================================
// keep track of col sort
// (in order to save the info in the state)
var lastSortedColumnId = "";
var colSortDirection = 1; // 1 for ascending, -1 for descending

const INIT_TAB_CHECK_BOXES = 1 << 0
const INIT_TAB_TABLE       = 1 << 1
const INIT_TAB_CHECK_BOXES_AND_TABLE = INIT_TAB_CHECK_BOXES | INIT_TAB_TABLE

//======================================
//       STANDALONE/ GENERALE UTILITIES:
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
function generateState() {

   const allCheckboxes = getAllCheckboxes();
   let checkedIds = ["+"];
   let uncheckedIds = ["-"];

   allCheckboxes.forEach((checkbox) => {
         if (checkbox.checked) {
            checkedIds.push(checkbox.id);
         } else {
            uncheckedIds.push(checkbox.id);
         }
   });

   const state = {
      queryArg: getQueryArg(),
      tabId: getActiveTabId(),
      sort: `${lastSortedColumnId},${colSortDirection}`,
      checkboxes:  (checkedIds.length > uncheckedIds.length) ?
                        uncheckedIds.join(',') :
                        checkedIds.join(',')
   }
   return compressToBase64(JSON.stringify(state));
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

function loadTabFromState(tabId, state) {
   if (state !== undefined && state.tabId === tabId) {
         // get csv values
         const csvValues = state.checkboxes.split(',');
         console.log(`loading checkboxes state as:${csvValues[0]}`);

         // Get the first value which is either "+" or "-"
         const operation = csvValues[0];

         const checkboxIds = csvValues.slice(1);

         const allCheckboxes = getAllCheckboxes();
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
         [lastSortedColumnId, colSortDirection] = state.sort.split(',');

         // source query info
         // stateQuery = state.queryArg;
   } else {
      setAllCheckboxes();
   }
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
function initTabTable() {

   const table = document.getElementById('tab-table-id');
   const headers = table.querySelectorAll('.col-header');

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
       lastSortedColumnId = event.target.id;;

       // Toggle sort direction
       colSortDirection *= -1;

       // Re-attach sorted rows to the table
       rows.forEach(row => tbody.appendChild(row));
     });
   });
}
//-------------
// init 2 - attach header <select>s handlers
//-------------
function initHeaderSelects() {

   document.querySelectorAll(".header-select").forEach(select => {
      select.addEventListener("change", function() {
            let table = document.getElementById("tab-table-id");
            let colIndex = Array.from(select.parentElement.parentElement.children).indexOf(select.parentElement);
            let selectedValue = this.value.toLowerCase();

            table.querySelectorAll("tbody tr").forEach(row => {
               let cell = row.children[colIndex]; // Get the correct column cell
               let cellValue = cell ? cell.textContent.trim().toLowerCase() : "";

               if (selectedValue === "all" || cellValue === selectedValue) {
                  row.style.display = "";
               } else {
                  row.style.display = "none";
               }
            });
      });
   });
}
//-----------------------------------
// function to sort the table by saved state's info
//-----------------------------------
function sortTabTable() {
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
function filterTableByCheckboxes() {
   const tableRows = document.querySelectorAll('#tab-table-id tbody tr');

   tableRows.forEach(row => {
      const name = row.getAttribute('data-name');
      const version = row.getAttribute('data-version');
      const isNameChecked = document.getElementById(name).checked;
      const isVersionChecked = document.getElementById(`${name}-${version}`).checked;

      if (isNameChecked && isVersionChecked) {
            row.style.display = '';
      } else {
            row.style.display = 'none';
      }
   });
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
function initMenuCheckBoxes() {

   const masterCheckbox = document.getElementById('masterCheckbox-id');
   const nameCheckboxes = document.querySelectorAll('.name-checkbox');
   const versionCheckboxes = document.querySelectorAll('.version-checkbox');

   //-------------
   //  3.1 - attach to MASTER - checkbox
   //-------------
   masterCheckbox.addEventListener('change', function () {
      const isChecked = this.checked;
      nameCheckboxes.forEach(checkbox => {
         checkbox.checked = isChecked;
      });
      versionCheckboxes.forEach(checkbox => {
         checkbox.checked = isChecked;
      });
      filterTableByCheckboxes();
   });
   //-------------
   //  3.2 - attach to NAME - checkboxes
   //-------------
   nameCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function () {
         const name = this.id;
         const isChecked = this.checked;

         document.querySelectorAll(`.version-checkbox[data-name="${name}"]`).forEach(vCheckbox => {
               vCheckbox.checked = isChecked;
         });

         filterTableByCheckboxes();
      });
   });

   //-------------
   //  3.3 - attach to VERSION - checkboxes
   //-------------
   versionCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', filterTableByCheckboxes);
   });
   sortTabTable();
}

//-----------------------------------
// function to get all the name & version checkboxes
//-----------------------------------
function getAllCheckboxes() {
   // Select only the checkboxes with the specified classes
   const nameCheckboxes = document.querySelectorAll('.name-checkbox');
   const versionCheckboxes = document.querySelectorAll('.version-checkbox');

   // Combine into 1 array
   return [...nameCheckboxes, ...versionCheckboxes];
}
//-----------------------------------
// function to set 'checked' all name & version checkboxes
//-----------------------------------
function setAllCheckboxes() {
   const masterCheckbox = document.getElementById('masterCheckbox-id');
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
         const base64State = generateState();
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


//-----------------------------------
// Main init function for tab contents
//-----------------------------------
function mainInit(tabId, initList) {

   if ((initList  & INIT_TAB_CHECK_BOXES_AND_TABLE) === INIT_TAB_CHECK_BOXES_AND_TABLE) {
      initTabTable();
      initMenuCheckBoxes();
      initHeaderSelects();
      loadTabFromState(tabId, window.jsonState);
      filterTableByCheckboxes();
      sortTabTable();
   }
}
