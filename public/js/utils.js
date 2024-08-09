
 document.addEventListener('DOMContentLoaded', () => {
   const table = document.getElementById('table-services');
   const headers = table.querySelectorAll('th');
   let sortDirection = 1; // 1 for ascending, -1 for descending

   headers.forEach((header, index) => {
     header.addEventListener('click', () => {
       const type = header.getAttribute('data-type');
       const tbody = table.querySelector('tbody');
       const rows = Array.from(tbody.querySelectorAll('tr'));

       rows.sort((a, b) => {
         const cellA = a.children[index].textContent.trim();
         const cellB = b.children[index].textContent.trim();

         if (type === 'num') {
           return (parseFloat(cellA) - parseFloat(cellB)) * sortDirection;
         } else if (type === 'date') {
           return (new Date(cellA) - new Date(cellB)) * sortDirection;
         } else {
           return cellA.localeCompare(cellB) * sortDirection;
         }
       });

       // Toggle sort direction
       sortDirection *= -1;

       // Re-attach sorted rows to the table
       rows.forEach(row => tbody.appendChild(row));
     });
   });
});


// Add handler to check boxes
document.addEventListener('DOMContentLoaded', function() {
   const masterCheckbox = document.getElementById('masterCheckbox');
   const nameCheckboxes = document.querySelectorAll('.name-checkbox');
   const versionCheckboxes = document.querySelectorAll('.version-checkbox');
   const tableRows = document.querySelectorAll('#table-services tbody tr');

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

   masterCheckbox.addEventListener('change', function() {
      const isChecked = this.checked;
      nameCheckboxes.forEach(checkbox => {
         checkbox.checked = isChecked;
      });
      versionCheckboxes.forEach(checkbox => {
         checkbox.checked = isChecked;
      });
      filterTable();
   });

   nameCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
         const name = this.id;
         const isChecked = this.checked;

         document.querySelectorAll(`.version-checkbox[data-name="${name}"]`).forEach(vCheckbox => {
               vCheckbox.checked = isChecked;
         });

         filterTable();
      });
   });

   versionCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', filterTable);
   });

   filterTable(); // Initial filter on page load
});
