  // Attach event listeners to sorting controls
document.addEventListener('DOMContentLoaded', () => {
   const table = document.getElementById('table-services');
   const headers = table.querySelectorAll('th');

   headers.forEach((header, index) => {
     header.addEventListener('click', function () {
       const columnType = header.getAttribute('data-type');
       const order = this.querySelector('.column-sort').getAttribute('data-order');
       sortTableByColumn(index, columnType, order);
     });
   });
 });

function sortTableByColumn(columnIndex, columnType, order) {
   const table = document.getElementById('table-services');
   const tbody = table.querySelector('tbody');
   const rows = Array.from(tbody.querySelectorAll('tr'));

   const sortedRows = rows.sort((a, b) => {
     const aVal = a.querySelector(`td:nth-child(${columnIndex + 1})`).innerText;
     const bVal = b.querySelector(`td:nth-child(${columnIndex + 1})`).innerText;

      let comparison = 0;
      if (columnType === 'num') {
         comparison = parseFloat(aVal) - parseFloat(bVal);
      } else if (columnType === 'date') {
         let aDate = aVal.split(' ')[0];  // of a value like "2024-07-30 (7 days ago)" keep the 1st part only
         let bDate = bVal.split(' ')[0];
         comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
      } else {  // Default to string comparison
         comparison = aVal.localeCompare(bVal);
      }


      // return order === 'asc' ? comparison : -comparison;
      let diff = order === 'asc' ? comparison : -comparison;
      console.log(`testing a:${aVal} vs b:${bVal} with ${order} --> ${diff}`);
      return diff;
   });

   // Re-render sorted rows
   tbody.innerHTML = '';
   sortedRows.forEach(row => tbody.appendChild(row));
 }
