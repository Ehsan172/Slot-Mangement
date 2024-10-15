const TOTAL_SCREENS = 30;
const campaignsKey = 'campaignsData';
let campaigns = [];
let bookedData = {};

// Set up initial elements
const campaignNameInput = document.getElementById('campaign-name');
const packageTypeSelect = document.getElementById('package-type');
const startDateInput = document.getElementById('start-date');
const packageSelect = document.getElementById('package');
const slotsSelect = document.getElementById('slots');
const availableScreensSelect = document.getElementById('available-screens');
const doneButton = document.getElementById('done-button');
const popup = document.getElementById('popup');
const okButton = document.getElementById('ok-button');
const availableScreensContainer = document.getElementById('available-screens-container');
const errorMessageDiv = document.getElementById('error-message');

// Disable past and today dates
function setMinDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    startDateInput.min = tomorrow.toISOString().split('T')[0];
}
setMinDate();

// Load existing campaigns from local storage
function loadCampaigns() {
    campaigns = JSON.parse(localStorage.getItem(campaignsKey)) || [];
    console.log('Loaded campaigns:', campaigns);
    initializeBookedData();
}

// Initialize booked data for validation
function initializeBookedData() {
    bookedData = {};
    campaigns.forEach(campaign => {
        const startDate = new Date(campaign.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + campaign.package - 1);

        for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            if (!bookedData[dateStr]) {
                bookedData[dateStr] = Array.from({ length: TOTAL_SCREENS }, () => ({ totalBookedSlots: 0, campaign: null }));
            }
            for (let screen = 0; screen < TOTAL_SCREENS; screen++) {
                bookedData[dateStr][screen].totalBookedSlots += campaign.slots;
                bookedData[dateStr][screen].campaign = campaign;
            }
        }
    });
}

// Load campaigns on window load
window.onload = loadCampaigns;

// Event listeners
packageTypeSelect.addEventListener('change', handlePackageTypeChange);
startDateInput.addEventListener('change', checkDateAvailability);
packageSelect.addEventListener('change', checkPackageAvailability);
slotsSelect.addEventListener('change', handleSlotChange);
doneButton.addEventListener('click', handleDone);
okButton.addEventListener('click', resetForm);

// Function to handle package type change
function handlePackageTypeChange() {
    const selectedPackageType = packageTypeSelect.value;
    startDateInput.disabled = selectedPackageType === '';
    const premiumOption = slotsSelect.querySelector('.premium');
    premiumOption.style.display = selectedPackageType === 'Premium' ? 'block' : 'none';
    resetFieldsBelowPackageType();
}

// Function to reset fields below package type
function resetFieldsBelowPackageType() {
    startDateInput.value = '';
    packageSelect.value = '';
    slotsSelect.value = '';
    availableScreensSelect.value = '';
    availableScreensContainer.classList.add('hidden');
    doneButton.classList.add('hidden');
    errorMessageDiv.textContent = '';
    packageSelect.disabled = true;
    slotsSelect.disabled = true;
}

// Function to check date availability
function checkDateAvailability() {
    const selectedStartDate = startDateInput.value;
    const isAvailable = isDateAvailable(selectedStartDate, 7, 2, 5);
    packageSelect.disabled = !isAvailable;
    errorMessageDiv.textContent = isAvailable ? '' : "No available slots and screens for the selected date. Please change the date.";
}

// Function to check package availability
function checkPackageAvailability() {
    const selectedStartDate = startDateInput.value;
    const selectedPackage = parseInt(packageSelect.value);
    const isAvailable = isDateAvailable(selectedStartDate, selectedPackage, 2, 5);
    slotsSelect.disabled = !isAvailable;
    errorMessageDiv.textContent = isAvailable ? '' : `No available slots and screens for ${selectedPackage} days. Please select a different package.`;
}

// Function to check if a date is available
function isDateAvailable(startDate, packageDuration, minSlots, minScreens, packageType = packageTypeSelect.value) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + packageDuration - 1);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        if (!bookedData[dateStr]) {
            continue; // No bookings on this date, so it's available
        }

        let availableScreens = 0;
        for (let screen = 0; screen < TOTAL_SCREENS; screen++) {
            const maxSlots = packageType === 'Premium' ? 10 : 8;
            if (bookedData[dateStr][screen].totalBookedSlots + minSlots <= maxSlots) {
                availableScreens++;
            }
        }

        if (availableScreens < minScreens) {
            return false; // Not enough screens available
        }
    }

    return true; // All checks passed, date is available
}

// Function to handle slot change
function handleSlotChange() {
    const selectedSlots = parseInt(slotsSelect.value);
    const selectedStartDate = startDateInput.value;
    const selectedPackage = parseInt(packageSelect.value);

    if (selectedSlots && selectedStartDate && selectedPackage) {
        const availableScreensCount = calculateAvailableScreens(selectedStartDate, selectedPackage, selectedSlots);
        populateAvailableScreens(availableScreensCount);
    } else {
        availableScreensContainer.classList.add('hidden');
        doneButton.classList.add('hidden');
    }
}

// Function to calculate available screens
function calculateAvailableScreens(startDate, packageDuration, slots) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + packageDuration - 1);

    let availableScreens = TOTAL_SCREENS;
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        if (!bookedData[dateStr]) continue;

        let freeScreens = 0;
        for (let screen = 0; screen < TOTAL_SCREENS; screen++) {
            const maxSlots = packageTypeSelect.value === 'Premium' ? 10 : 8;
            if (canBookSlots(dateStr, screen, slots, maxSlots)) {
                freeScreens++;
            }
        }
        availableScreens = Math.min(availableScreens, freeScreens);
    }

    return availableScreens;
}

// Function to check if slots can be booked for the selected screen
function canBookSlots(dateStr, screen, requestedSlots, maxSlots) {
    const totalBookedSlots = bookedData[dateStr][screen].totalBookedSlots;
    const premiumBooking = packageTypeSelect.value === 'Premium';
    
    // Premium can book last 2 reserved slots
    if (premiumBooking) {
        return (totalBookedSlots + requestedSlots <= maxSlots) || (requestedSlots <= 2 && totalBookedSlots < maxSlots);
    }

    // Standard can book up to 8 slots max
    return totalBookedSlots + requestedSlots <= maxSlots;
}

// Function to populate available screens
function populateAvailableScreens(availableScreensCount) {
    availableScreensSelect.innerHTML = '<option value="">Select Screens</option>';
    const maxScreensOption = Math.floor(availableScreensCount / 5) * 5;

    for (let i = 5; i <= maxScreensOption && i <= availableScreensCount; i += 5) {
        availableScreensSelect.innerHTML += `<option value="${i}">${i} Screens</option>`;
    }

    if (maxScreensOption === 0) {
        errorMessageDiv.textContent = "No screens available for the selected slots. Please choose fewer slots or a different date.";
        availableScreensContainer.classList.add('hidden');
        doneButton.classList.add('hidden');
    } else {
        availableScreensContainer.classList.remove('hidden');
        doneButton.classList.remove('hidden');
        errorMessageDiv.textContent = '';
    }
}

// Function to handle done button click
function handleDone() {
    const campaignName = campaignNameInput.value.trim();
    const selectedPackageType = packageTypeSelect.value;
    const selectedStartDate = startDateInput.value;
    const selectedPackage = parseInt(packageSelect.value);
    const selectedSlots = parseInt(slotsSelect.value);
    const selectedScreensCount = parseInt(availableScreensSelect.value);

    if (campaignName && selectedPackageType && selectedStartDate && selectedPackage && selectedSlots && selectedScreensCount) {
        const isPremiumOnly = selectedSlots > 8 || !isDateAvailable(selectedStartDate, selectedPackage, selectedSlots, selectedScreensCount, 'Standard');
        const reservedSlots = getReservedSlots(selectedStartDate, selectedPackage, selectedSlots);

        if (selectedPackageType === 'Premium' && isPremiumOnly) {
            showPopup("Proceed with the Premium booking!", "Proceed", closePopup, proceedWithBooking);
        } else if (selectedPackageType === 'Premium' && !isPremiumOnly) {
            showPopup("These configurations are available in the Standard package. Would you like to proceed with Standard?", "Proceed with Standard", closePopup, proceedWithStandardBooking);
        } else {
            showPopup("Proceed with the booking!", "Proceed", closePopup, proceedWithBooking);
        }
    } else {
        showError("Please fill all fields correctly.");
    }
}

// Function to close the popup
function closePopup() {
  popup.classList.add('hidden');
}

// Function to check if the selected slots include reserved slots
function getReservedSlots(startDate, packageDuration, selectedSlots) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + packageDuration - 1);

  let reservedSlots = 0;
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    if (!bookedData[dateStr]) continue;

    for (let screen = 0; screen < TOTAL_SCREENS; screen++) {
      const maxSlots = 8; // Standard package max slots
      const bookedSlots = bookedData[dateStr][screen].totalBookedSlots;
      const availableSlots = maxSlots - bookedSlots;
      if (availableSlots < selectedSlots) {
        reservedSlots += selectedSlots - availableSlots;
      }
    }
  }

  return reservedSlots;
}

// Function to handle booking with standard package
function proceedWithStandardBooking() {
    const campaignName = campaignNameInput.value.trim();
    const selectedStartDate = startDateInput.value;
    const selectedPackage = parseInt(packageSelect.value);
    const selectedSlots = parseInt(slotsSelect.value);
    const selectedScreensCount = parseInt(availableScreensSelect.value);

    // Change package type to standard
    packageTypeSelect.value = 'Standard';

    // Proceed with booking using the standard package
    proceedWithBooking();
  closePopup();
}

// Function to show popup
function showPopup(message, primaryButtonText, backButtonAction, proceedAction) {
  popup.classList.remove('hidden');
  popup.innerHTML = `
    <p>${message}</p>
    <button id="proceed-button">${primaryButtonText}</button>
    <button id="back-button">Back</button>
  `;
  document.getElementById('proceed-button').onclick = proceedAction;
  document.getElementById('back-button').onclick = backButtonAction;
}

// Function to handle booking
function proceedWithBooking() {
    const campaignName = campaignNameInput.value.trim();
    const selectedPackageType = packageTypeSelect.value;
    const selectedStartDate = startDateInput.value;
    const selectedPackage = parseInt(packageSelect.value);
    const selectedSlots = parseInt(slotsSelect.value);
    const selectedScreensCount = parseInt(availableScreensSelect.value);
    
    const endDate = new Date(selectedStartDate);
    endDate.setDate(endDate.getDate() + selectedPackage - 1);
    
    for (let date = new Date(selectedStartDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        if (!bookedData[dateStr]) {
            bookedData[dateStr] = Array.from({ length: TOTAL_SCREENS }, () => ({ totalBookedSlots: 0, campaign: null }));
        }
        let bookedScreens = 0;
        for (let screen = 0; screen < TOTAL_SCREENS && bookedScreens < selectedScreensCount; screen++) {
            const maxSlots = selectedPackageType === 'Premium' ? 10 : 8;
            if (canBookSlots(dateStr, screen, selectedSlots, maxSlots)) {
                bookedData[dateStr][screen].totalBookedSlots += selectedSlots;
                bookedData[dateStr][screen].campaign = { campaignName, packageType: selectedPackageType, startDate: selectedStartDate, package: selectedPackage, slots: selectedSlots, screens: selectedScreensCount };
                bookedScreens++;
            }
        }
        if (bookedScreens < selectedScreensCount) {
            showError(`Not enough available screens for ${selectedSlots} slots on ${dateStr}.`);
            return; // Exit if not enough screens could be booked
        }
 closePopup();
    }

    // Save campaign data to local storage
    const campaignData = { campaignName, packageType: selectedPackageType, startDate: selectedStartDate, package: selectedPackage, slots: selectedSlots, screens: selectedScreensCount };
    campaigns.push(campaignData);
    localStorage.setItem(campaignsKey, JSON.stringify(campaigns));

    // Download detailed CSV
    downloadCSV();

    // Show booking success message
    showSuccessPopup();
}

// Function to download campaigns as detailed CSV
function downloadCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";

    const header = Array.from({ length: TOTAL_SCREENS }, (_, i) => `Screen ${i + 1}`).join(", ");
    csvContent += `Date, ${header}\n`;

    for (const date in bookedData) {
        csvContent += `${date},`;
        for (let screen = 0; screen < TOTAL_SCREENS; screen++) {
            const slotsBooked = bookedData[date][screen].totalBookedSlots || 0;
            csvContent += `'${slotsBooked}', `;
        }
        csvContent = csvContent.slice(0, -2) + "\n"; // Remove last comma and space
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "detailed_campaigns.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to show success message after booking
function showSuccessPopup() {
    popup.classList.remove('hidden');
    popup.innerHTML = `
        <p>Booking is successfully done!</p>
        <button id="ok-button">OK</button>
    `;
    document.getElementById('ok-button').onclick = resetForm;
}

// Function to show error messages
function showError(message) {
    errorMessageDiv.textContent = message;
}

// Function to reset form
function resetForm() {
    campaignNameInput.value = '';
    packageTypeSelect.value = '';
    startDateInput.value = '';
    packageSelect.value = '';
    slotsSelect.value = '';
    availableScreensSelect.value = '';
    availableScreensContainer.classList.add('hidden');
    doneButton.classList.add('hidden');
    popup.classList.add('hidden');
    errorMessageDiv.textContent = '';

    startDateInput.disabled = true;
    packageSelect.disabled = true;
    slotsSelect.disabled = true;
}

// Load campaigns from local storage when the window is loaded
window.onload = loadCampaigns;