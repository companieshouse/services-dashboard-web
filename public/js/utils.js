
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

         if (type === 'number') {
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
document.addEventListener('DOMContentLoaded', () => {
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

   masterCheckbox.addEventListener('change', () => {
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
      checkbox.addEventListener('change', () => {
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

  document.getElementById('button-share').addEventListener('click', async () => {
      try {
         const base64State = generateState();
         const response = await fetch(`/dashboard?savestate=${base64State}`);
         if (response.ok) {
            const linkId = await response.text();
            const currentUrl = window.location.href;
            const shareUrl = `${currentUrl}?linkid=${encodeURIComponent(linkId)}`;
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

});



function generateState() {
   // Select only the checkboxes with the specified classes
   const nameCheckboxes = document.querySelectorAll('.name-checkbox');
   const versionCheckboxes = document.querySelectorAll('.version-checkbox');

   // Combine into 1 array
   const allCheckboxes = [...nameCheckboxes, ...versionCheckboxes];

   let checkedIds = ["+"];
   let uncheckedIds = ["-"];

   allCheckboxes.forEach((checkbox) => {
         if (checkbox.checked) {
            checkedIds.push(checkbox.id);
         } else {
            uncheckedIds.push(checkbox.id);
         }
   });

   if (checkedIds.length > uncheckedIds.length) {
      return compressToBase64(uncheckedIds.join(','));
   }
   return compressToBase64(checkedIds.join(','));
}

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

   console.log(base64String);
   return base64String;
}

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
