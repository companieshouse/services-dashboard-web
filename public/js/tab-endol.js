//======================================
//       GLOBAL VARS
//======================================
// keep track of col sort
// (in order to save the info in the state)
var lastSortedColumnId = "";
var colSortDirection = 1; // 1 for ascending, -1 for descending

// keep info if the page was loaded from a state
var stateQuery = "";

//======================================
//       STANDALONE/ GENERALE UTILITIES:
//======================================

//-----------------------------------
// function to init all NAME & VERSION checkboxes from the received 'state'
//-----------------------------------
function sourceState() {

   // without a state, show all checkboxes (= set master checkbox & trigger its handler)
   const masterCheckbox = document.getElementById('masterCheckbox-id');
   masterCheckbox.checked = true;
   const event = new Event('change');
   masterCheckbox.dispatchEvent(event);
}

//-----------------------------------
// function to sort the table by saved state's info
//-----------------------------------
function sortTable() {
   const col = document.getElementById(lastSortedColumnId);
   if (col) {
      col.click();
   }
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
// function to read the "query" arg value, if present
//-----------------------------------
function getQueryArg() {
   const params = new URLSearchParams(window.location.search);
   return params.get('query') || stateQuery;
}

//======================================
//       ONLOAD / INIT  CODE:
//======================================

//-----------------------------------
// attach most handlers
//-----------------------------------
// document.addEventListener('DOMContentLoaded', () => {
function initialiseTabContent() {
   //-------------
   // 1 - attach sort handlers to table headers
   //-------------
   const table = document.getElementById('table-endol');
   const headers = table.querySelectorAll('.col-header');

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

   //-------------
   // 2 - attach checkboxes handlers
   //-------------
   const masterCheckbox = document.getElementById('masterCheckbox-id');
   const nameCheckboxes = document.querySelectorAll('.name-checkbox');
   const versionCheckboxes = document.querySelectorAll('.version-checkbox');
   const tableRows = document.querySelectorAll('#table-endol tbody tr');

   function filterTable() {
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
   //-------------
   //  2.1 - attach to MASTER - checkbox
   //-------------
   masterCheckbox.addEventListener('change', function () {
      const isChecked = this.checked;
      nameCheckboxes.forEach(checkbox => {
         checkbox.checked = isChecked;
      });
      versionCheckboxes.forEach(checkbox => {
         checkbox.checked = isChecked;
      });
      filterTable();
   });

   //-------------
   //  2.2 - attach to NAME - checkboxes
   //-------------
   nameCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function () {
         const name = this.id;
         const isChecked = this.checked;

         document.querySelectorAll(`.version-checkbox[data-name="${name}"]`).forEach(vCheckbox => {
               vCheckbox.checked = isChecked;
         });

         filterTable();
      });
   });

   //-------------
   //  2.3 - attach to VERSION - checkboxes
   //-------------
   versionCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', filterTable);
   });
   const col = document.getElementById(lastSortedColumnId);
   if (col) {
      col.click();
   }

   // Initial filter on page load
   sourceState();
   filterTable();
   sortTable();

}
