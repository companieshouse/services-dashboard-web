
const tabTableId = 'tab-table-id';
const masterCheckboxId = 'masterCheckbox-id';
const classLevel1Checkbox = 'level1-checkbox';
const classLevel2Checkbox = 'level2-checkbox';


function initialiseTabContent() {
   initTabTable(tabTableId);
   initMenuCheckBoxes(tabTableId, masterCheckboxId, classLevel1Checkbox, classLevel2Checkbox);
   initHeaderSelects(tabTableId);
   loadTabFromState('tab-services-id', window.jsonState);
   filterTableByCheckboxes(tabTableId);
   sortTabTable();
}

function generateTabState() {
   console.log("generateTabState for tab-services");
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



function loadTabFromState(tabId, state) {
   console.log("loadTabFromState for tab-services");
   if (state !== undefined && state.tabId === tabId) {
      // get csv values
      const csvValues = state.checkboxes.split(',');
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
      [lastSortedColumnId, colSortDirection] = state.sort.split(',');

      // source query info
      // stateQuery = state.queryArg;
   } else {
      setAllCheckboxes(masterCheckboxId);
   }
}
