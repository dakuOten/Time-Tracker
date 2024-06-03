ZOHO.embeddedApp.on("PageLoad", function (data) {


    let recordId = data.EntityId;

    const getElement = (id) => document.getElementById(id);
    let timesheetId;
    let module;
    let timesheetRecordName;
    let userId;
    let hourly_rate;
    let timerInterval;
    const timerFields = getElement('timer-fields');
    const navigation = getElement('navigation');
    const nameField = getElement("name");
    const typeSelect = getElement("type");
    const descriptionField = getElement("description");
    const hourlyRateField = getElement("hourly_rate");
    const finishTimer = getElement("submit-button");
    const finishTimerManual = getElement("submit-button-manual")
    const moduleName = getElement("module-name");
    const pop_up = getElement('pop-up');
    const popMsg = getElement('popMsg');
    const noteMessage = getElement("note-message");
    const noteMessageDiv = getElement("note-message-div");
    const autoTimerButton = getElement('auto-timer');
    const startTimerButton = getElement('start-timer');
    const manualTimerButton = getElement('manual-timer');
    const timeContainer = getElement('time-container');
    const manualTimerFields = getElement('manual-timer-fields');
    const backButton = getElement('back-button');
    const startDateTimeInput = getElement('start_time');
    const endDateTimeInput = getElement('end_time');
    const startDateTimeInputError = getElement('start-time-error');
    const endDateTimeInputError = getElement('end-time-error');
    const relatedModuleDiv = getElement('related-module-div');
    const hourlyRateDiv = getElement('hourly-rate-div');
    const descriptionDiv = getElement('description-div');
    const leavetimer = getElement('leave-timer');
    const restriction = getElement('restrictionMessage');
    
    const addClass = (element, className) => element.classList.add(className);
    const removeClass = (element, className) => element.classList.remove(className);
    let isManualTimer;
    let relatedToDeals;
    let relatedToContacts;
    let relatedToLeads;
    let relatedToAccounts;



    //============================================================================================================================
    // Function that capable to make a button to leaving the timer as idle background * leaving running
    //============================================================================================================================


    const leaveTimer = async () => {
        return await ZOHO.CRM.UI.Popup.close();
    }

     leavetimer.addEventListener('click',()=>{
        leaveTimer()
        })



  
    //============================================================================================================================
    // 5/30/2024 added functions 
    //============================================================================================================================


    //============================================================================================================================
    // Get the records of claims
    //============================================================================================================================

    let getRecord = async () => { 
        let recordData = await ZOHO.CRM.API.getRecord({Entity: "Deals", approved: "both", RecordID:recordId })
        let claimRecord = recordData.data.shift();
        return claimRecord;
    }
 

    //============================================================================================================================
    // Function that capable to check the current login user
    //============================================================================================================================

    let checkUserLogin = async () => { 
        let configUser = await  ZOHO.CRM.CONFIG.getCurrentUser();
        configUser = configUser.users.shift();
        return configUser;
    }

        //============================================================================================================================
    // Function that capable to check the current login user
    //============================================================================================================================
    async function checkOwnerClaim(){
        let userDetails = await checkUserLogin();
        let recordDetails = await getRecord();

        if(userDetails.id != recordDetails.Owner.id){
            // if not equal create a message this isnt your record and it will count 5 secs then return leave
           await ZOHO.CRM.UI.Resize({height:"100",width:"600"})
            removeClass(restriction,'d-none');
            addClass(autoTimerButton,'d-none');
            addClass(manualTimerButton,'d-none');
            setTimeout(() => {
                removeClass(restriction,'d-none');
                leaveTimer()
              }, 5000);
        }
    }

    checkOwnerClaim()

    //============================================================================================================================
    //
    //============================================================================================================================

    //get the record name
    ZOHO.CRM.API.searchRecord({Entity:"Timesheet_Logs",Type:"criteria",Query:"(Deal_Related_To:equals:"+data.EntityId+")",delay:false})
    .then(function(data){
        console.log(data)
    })
    ZOHO.CRM.CONFIG.getCurrentUser().then(function(userData){
        userId = userData.users[0].id;
        fetchRunningTimer(true);
        console.log(userData);
    });

    function fetchRunningTimer(isInitialize) {
        console.log("initialize" + isInitialize);
        ZOHO.CRM.API.searchRecord({Entity:"Timesheet_Logs",Type:"criteria",Query:"((Finished:equals:false)and(Owner_ID:equals:"+ userId +"))",delay:false,per_page:1,page:1}).then(function(response){
            if(response.hasOwnProperty("data")== true){
                let record = response.data[0];
                timesheetId = record.id;
                nameField.value = record.Name;
                typeSelect.value = record.Types;
                descriptionField.value = record.Description;
                handleDisplayAutoTimer();
                timerClock(record.Start_Time, true);

                if(record.Deal_Related_To != null) module= "Claims";
                if(record.Account_Related_To != null) module = "Members";
                if(record.Contact_Related_To != null) module = record.Contact_Related_To.module;
                if(record.Lead_Related_To != null) module = record.Lead_Related_To.module;
                handleNoteMessage(record, module);
                moduleName.innerText = module;
                isManualTimer = false;
                console.log(record);
            }else{
                if(!isInitialize){
                    handleCreateTimesheetLogRecords();
                    isManualTimer = false;
                }else{
                    handleDisplayDefault();
                    handleGetRecordInformation();
                    isManualTimer = true;
                }
            }
        })
    }

    const handleNoteMessage = (record, module) =>{
        if((record.Deal_Related_To != null && data.Entity != "Deals") ||
            (record.Account_Related_To != null && data.Entity != record.Account_Related_To.module) ||
            (record.Contact_Related_To != null && data.Entity != module) ||
            (record.Lead_Related_To != null && data.Entity != module)
        ){
            removeClass(noteMessageDiv,'d-none');
            noteMessage.innerText = "You have a running timer for a record in the "+module+" module. Finish the timer to start a new one.";
        }else if((record.Deal_Related_To != null && data.Entity == "Deals" && data.EntityId != record.Deal_Related_To.id) ||
            (record.Account_Related_To != null && data.Entity == record.Account_Related_To.module && data.EntityId != record.Account_Related_To.id) ||
            (record.Contact_Related_To != null && data.Entity == module && data.EntityId != record.Contact_Related_To.id) ||
            (record.Lead_Related_To != null && data.Entity == module && data.EntityId != record.Lead_Related_To.id)
        ){
            removeClass(noteMessageDiv,'d-none');
            noteMessage.innerText = "You have a running timer for another record. Finish the timer to start a new one";
        }else{
            addClass(noteMessageDiv, 'd-none');
        }
    }

    //get the organization variable
    ZOHO.CRM.API.getOrgVariable("Hourly_Rate").then(function(response){
       
        if (response.Success && response.Success.Content) {
            var hourlyRate = parseFloat(response.Success.Content);
                hourly_rate = hourlyRate;
            if (hourlyRate > 0) {
                hourlyRateField.value = hourlyRate;
            }
        } else {
            console.error("Error retrieving Hourly Rate");
        }
    });

    function validateDateTime(inputElement) {
        if (inputElement.checkValidity()) {
            removeClass(inputElement,'border-danger');
        } else {
            addClass(inputElement, 'border-danger');
        }
    }

    function timerClock(startDateTime, autoTimer = false) {
        let hoursSpan = getElement('hours');
        let minutesSpan = getElement('minutes');
        let secondsSpan = getElement('seconds');
        console.log("original start date : "+ startDateTime)
        let formattedDateString;
        console.log(autoTimer);
        if(autoTimer){
            // const parsedDate = new Date(startDateTime);
            // console.log("new date : " +parsedDate)
            // console.log("parsed data : "+parsedDate.getTimezoneOffset());
            // parsedDate.setMinutes(parsedDate.getMinutes() + parsedDate.getTimezoneOffset());
            // console.log("parse minutes : " + parsedDate);
            formattedDateString = startDateTime.slice(0, 19);
            // formattedDateString = parsedDate;
            // console.log("parsed data : "+parsedDate.getTimezoneOffset());
            console.log("formated Time : " +formattedDateString)
        }
        let diff = calculateTimeDifference(autoTimer ? formattedDateString: startDateTime);

        let countdownTimeInSeconds = diff;

        // Calculate the initial hours, minutes, and seconds
        let hours = Math.floor(countdownTimeInSeconds / 3600);
        let minutes = Math.floor((countdownTimeInSeconds % 3600) / 60);
        let seconds = countdownTimeInSeconds % 60;

        updateTimerDisplay();

        timerInterval = setInterval(() =>{
            countdownTimeInSeconds++;
            // Calculate the remaining hours, minutes, and seconds
            hours = Math.floor(countdownTimeInSeconds / 3600);
            minutes = Math.floor((countdownTimeInSeconds % 3600) / 60);
            seconds = countdownTimeInSeconds % 60;

            // Update the timer display
            updateTimerDisplay();
        },1000);

        function updateTimerDisplay() {
            // Format the hours, minutes, and seconds with leading zeros
            const formattedHours = String(hours).padStart(2, "0");
            const formattedMinutes = String(minutes).padStart(2, "0");
            const formattedSeconds = String(seconds).padStart(2, "0");

            // Display the formatted time in the "timer" div
            hoursSpan.innerHTML = formattedHours;
            minutesSpan.innerHTML = formattedMinutes;
            secondsSpan.innerHTML = formattedSeconds;
        }
    }

    function calculateTimeDifference(startDateTimeString) {
        // Convert input strings to Date objects
        const startDateTime = new Date(startDateTimeString);
        const endDateTime = new Date();
    

        const timeDifference = Math.abs(endDateTime - startDateTime);
        const timeDifferenceInSeconds = Math.floor(timeDifference / 1000);
        console.log("Start " +startDateTimeString);
        console.log("End " +endDateTime)
        console.log("Time Diff" + timeDifference);
        return timeDifferenceInSeconds;

    }

    //create a new timeformat string 
    function getTime() {
        // Create a new Date object
        let currentDateTime = new Date();

        // Get the current date components
        let year = currentDateTime.getFullYear();
        let month = ('0' + (currentDateTime.getMonth() + 1)).slice(-2);
        let day = ('0' + currentDateTime.getDate()).slice(-2);

        // Get the current time components
        let hours = ('0' + currentDateTime.getHours()).slice(-2);
        let minutes = ('0' + currentDateTime.getMinutes()).slice(-2);
        let seconds = ('0' + currentDateTime.getSeconds()).slice(-2);

        // Construct the current date and time string
        let currentDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        return currentDateTimeString;
    }
    //pop-up
    function openPopup(type) {
        pop_up.style.display = 'block';
        pop_up.style.top = "10px";

        if(type== "error"){
            pop_up.style.backgroundColor = "#e08d96";
            popMsg.innerText = "Opps! Something Went Wrong"
        }
        if(type=="success"){
            pop_up.style.backgroundColor = "#7bdba9";
            popMsg.innerText = "Success! Your operation was completed successfully."
        }
        if(type == "warning"){
            pop_up.style.backgroundColor = "#d4af6a";
            popMsg.innerText = "This timer has been already ended."
        }

    }

    //creation of timesheet logs
    startTimerButton.addEventListener('click', () => {
        buttonSpinner(startTimerButton);
        fetchRunningTimer(false);
    });

    const handleCreateTimesheetLogRecords = () => {
        let Start_Time = getTime();
        timerClock(Start_Time);

        let recordData = {
            "Name": nameField.value,
            "Deal_Related_To":relatedToDeals,
            "Lead_Related_To":relatedToLeads,
            "Contact_Related_To":relatedToContacts,
            "Account_Related_To": relatedToAccounts,
            "Types":typeSelect.value,
            "Hourly_Rate1":hourly_rate,
            "Start_Time": Start_Time,
            "Owner_ID": userId
        }

        ZOHO.CRM.API.insertRecord({Entity:"Timesheet_Logs",APIData:recordData}).then(function(res){
            if(res.hasOwnProperty("data")== true){
                if(res.data[0].code == "SUCCESS"){
                    handleDisplayAutoTimer();
                    timesheetId = res.data[0].details.id;
                    handleDisabledButton();
                }else{
                    
                }
            }
        });
    }

    //end timer
    finishTimer.addEventListener('click',()=>{
        clearInterval(timerInterval);
        buttonSpinner(finishTimer);
        let end_time = getTime();
        let updateDate={
        Entity:"Timesheet_Logs",
        APIData:{
            "id": timesheetId,
            "Name": nameField.value,
            "End_Time": end_time,
            "Description":descriptionField.value,
            "Finished": true,
            "Types": typeSelect.value
            }
        }

        ZOHO.CRM.API.searchRecord({Entity:"Timesheet_Logs",Type:"criteria",Query:"(id:equals:"+timesheetId+")",delay:false}).then(function(res){
            if(res.hasOwnProperty("data")== true){

                if(res.data[0].Finished == false){
                    ZOHO.CRM.API.updateRecord(updateDate).then(function(res){
                        if(res.data[0].code == "SUCCESS"){
                            openPopup("success");
                            setTimeout(() => {
                                ZOHO.CRM.UI.Popup.closeReload()
                                .then(function(data){
                                    console.log("Success")
                                })
                            }, "2000");
                        }   
                    })
                }else{
                    openPopup("warning");
                    setTimeout(() => {
                        ZOHO.CRM.UI.Popup.closeReload()
                        .then(function(data){
                            console.log("Error")
                        })
                      }, "2000");
                }
               
            }else{
                openPopup("error");
                setTimeout(() => {
                    ZOHO.CRM.UI.Popup.closeReload()
                        .then(function(data){
                            console.log("Error")
                        })
                  }, "2000");
            }
        })
    });

    //creating record in a manual timer
    finishTimerManual.addEventListener('click',() =>{
        buttonSpinner(finishTimerManual);
        let recordData = {
            "Name": nameField.value,
            "Types": typeSelect.value,
            "Deal_Related_To":relatedToDeals,
            "Lead_Related_To":relatedToLeads,
            "Contact_Related_To":relatedToContacts,
            "Account_Related_To": relatedToAccounts,
            "Hourly_Rate1":hourly_rate,
            "Start_Time": startDateTimeInput.value + ":00",
            "End_Time": endDateTimeInput.value  + ":00",
            "Description":descriptionField.value,
            "Finished":true,
            "Owner_ID": userId
        }


        //create record
        ZOHO.CRM.API.insertRecord({Entity:"Timesheet_Logs",APIData:recordData}).then(function(res){
            if(res.hasOwnProperty("data")== true){
                if(res.data[0].code == "SUCCESS"){
                    openPopup("success");
                    setTimeout(() => {
                        ZOHO.CRM.UI.Popup.closeReload()
                        .then(function(data){
                            console.log("Success")
                        })
                      }, "2000");
                }else{
                    openPopup("error");
                    setTimeout(() => {
                        ZOHO.CRM.UI.Popup.closeReload()
                        .then(function(data){
                            console.log("error")
                        })
                    }, "2000");
                } 
             }else{
                openPopup("error");
                    setTimeout(() => {
                        ZOHO.CRM.UI.Popup.closeReload()
                        .then(function(data){
                            console.log("error")
                        })
                    }, "2000");
             }
        });
    });

    const buttonSpinner = (element) => {
        element.innerText = "Saving....";
        element.disabled = true;
        const loadingIndicator = document.createElement('span');
        loadingIndicator.innerHTML = ' <i class="fa fa-spinner fa-spin"></i>'; // Example: using Font Awesome for a spinner icon
        element.appendChild(loadingIndicator);
    }

    autoTimerButton.addEventListener('click', () => {
        removeClass(timerFields,'d-none');
        removeClass(startTimerButton,'d-none');
        removeClass(backButton,'d-none');
        addClass(navigation,'d-none');
        addClass(finishTimerManual,'d-none');
        nameField.value = timesheetRecordName;
        handleValidationBeforeStartTimer();
        console.log('auto time clicked');
    })

    nameField.addEventListener('keyup', () =>{
        handleDisabledButton();
        handleValidationBeforeStartTimer();
    });

    typeSelect.addEventListener('change', () =>{
        handleDisabledButton();
        handleValidationBeforeStartTimer();
    })

    manualTimerButton.addEventListener('click', () => {
        nameField.value = '';
        handleDisplayForManual();
        handleDisabledButton(true);
    });

    backButton.addEventListener('click', () => {
        handleDisplayDefault();
        handleFieldBack();
    });

    startDateTimeInput.addEventListener('change', (event) => {
        validateDateTime(event.target);
        handleDisabledButton(true);
    });

    endDateTimeInput.addEventListener('change', (event) => {
        validateDateTime(event.target);
        handleDisabledButton(true);
    });

    const handleValidationBeforeStartTimer = () =>{
        let isEmptyNameField = nameField.value === '';
        let isEmptyTypSelectField = typeSelect.value ==='';
        addOrRemoveClass(nameField, 'border-danger', isEmptyNameField);
        addOrRemoveClass(typeSelect, 'border-danger', isEmptyTypSelectField);
        if(isEmptyNameField || isEmptyTypSelectField){
            startTimerButton.disabled = true;
        }else{
            startTimerButton.disabled = false;
        }
    }

    function handleDisabledButton (isManual){
        let startTime = new Date(startDateTimeInput.value).getTime();;
        let  endTime = new Date(endDateTimeInput.value).getTime();
       
        let isEmptyNameField = nameField.value === '';
        let isEmptyTypSelectField = typeSelect.value ==='';
        let isEmptyStartTimeInput = startDateTimeInput.value === '';
        let isEmptyEndTimeInput = endDateTimeInput.value === '';
        let isStartTimeGreaterThanEndTime = startTime >= endTime;
       
    
        if (isEmptyNameField || isEmptyTypSelectField || (isManualTimer && (isEmptyStartTimeInput || isEmptyEndTimeInput || isStartTimeGreaterThanEndTime))) {
            finishTimer.disabled = true;
            finishTimerManual.disabled = true;
            addOrRemoveClass(nameField, 'border-danger', isEmptyNameField);
            addOrRemoveClass(typeSelect, 'border-danger', isEmptyTypSelectField);

            if (isManual) {
                addOrRemoveClass(startDateTimeInput, 'border-danger', isEmptyStartTimeInput || isStartTimeGreaterThanEndTime);
                addOrRemoveClass(endDateTimeInput, 'border-danger', isEmptyEndTimeInput || isStartTimeGreaterThanEndTime);
                removeOrAddClass(startDateTimeInputError, 'd-none', isStartTimeGreaterThanEndTime);
                removeOrAddClass(endDateTimeInputError, 'd-none', isStartTimeGreaterThanEndTime);
            }
        } else {
            finishTimer.disabled = false;
            finishTimerManual.disabled = false;
            addOrRemoveClass(nameField, 'border-danger', isEmptyNameField);
            addOrRemoveClass(typeSelect, 'border-danger', isEmptyTypSelectField);
            addOrRemoveClass(startDateTimeInput, 'border-danger', isEmptyStartTimeInput || isStartTimeGreaterThanEndTime);
            addOrRemoveClass(endDateTimeInput, 'border-danger', isEmptyEndTimeInput || isStartTimeGreaterThanEndTime);
            removeOrAddClass(startDateTimeInputError, 'd-none', isStartTimeGreaterThanEndTime);
            removeOrAddClass(endDateTimeInputError, 'd-none', isStartTimeGreaterThanEndTime);
        }
    };

    const addOrRemoveClass = (element, className, condition) => {
        if (condition) {
            addClass(element, className);
        } else {
            removeClass(element, className);
        }
    };

    const removeOrAddClass = (element, className, condition) => {
        if (condition) {
            removeClass(element, className);
        } else {
            addClass(element, className);
        }
    };

    const handleDisplayForManual = () => {
        addClass(navigation, 'd-none');
        addClass(timeContainer, 'd-none');
        addClass(finishTimer, 'd-none');
        addClass(startTimerButton, 'd-none');
        removeClass(timerFields, 'd-none');
        removeClass(manualTimerFields, 'd-none');
        removeClass(backButton, 'd-none');
        removeClass(finishTimerManual, 'd-none');
        handleFieldDivDisplay();
    }
    

    const handleDisplayAutoTimer = () => {
        addClass(navigation,'d-none');
        addClass(finishTimerManual,'d-none');
        addClass(startTimerButton,'d-none');
        addClass(backButton,'d-none');
        removeClass(leavetimer,'d-none');
        removeClass(timerFields,'d-none');
        removeClass(timeContainer, 'd-none');
        removeClass(finishTimer,'d-none');
        handleFieldDivDisplay();
    }

    const handleDisplayDefault = () => {
        removeClass(navigation, 'd-none');
        addClass(timerFields, 'd-none');
        addClass(timeContainer, 'd-none');
        addClass(manualTimerFields, 'd-none');
        addClass(backButton, 'd-none');
        console.log("default display");
    }

    const handleFieldDivDisplay = () => {
        removeClass(relatedModuleDiv, 'd-none');
        removeClass(hourlyRateDiv, 'd-none');
        removeClass(descriptionDiv, 'd-none');
    }

    const handleFieldBack= () => {
        addClass(relatedModuleDiv, 'd-none');
        addClass(hourlyRateDiv, 'd-none');
        addClass(descriptionDiv, 'd-none');
        nameField.value = '';
        startDateTimeInput.value = '';
        endDateTimeInput.value = '';
        removeClass(nameField,'border-danger');
        removeClass(startDateTimeInput,'border-danger');
        removeClass(endDateTimeInput,'border-danger');
    }

    const handleGetRecordInformation = () => {
        ZOHO.CRM.API.getRecord({Entity: data.Entity, approved: "both", RecordID:data.EntityId[0]})
            .then(function(record){
                
            let currentDate = new Date().toJSON().slice(0, 10);
            let fName = record.data[0].First_Name;
            let lName = record.data[0].Last_Name;

            if (fName == null) fName = "";
            if (lName == null) lName = "";

            let fullName = fName + " " + lName;
            if(data.Entity == "Deals"){
                timesheetRecordName = record.data[0].Deal_Name + " - " + currentDate;
                moduleName.innerText = "Claims";
                relatedToDeals = {
                    module:data.Entity,
                    name:record.data[0].Deal_Name,
                    id:data.EntityId[0]
                }
            }

            if(data.Entity ==  "Contacts"){
                timesheetRecordName = fullName + " - " + currentDate;
                moduleName.innerText= "Contacts";
                relatedToContacts = {
                    module:data.Entity,
                    name:fullName,
                    id:data.EntityId[0]
                };
            }

            if(data.Entity == "Leads"){
                timesheetRecordName = record.data[0].First_Name + " " + record.data[0].Last_Name +" - " + currentDate;
                moduleName.innerText = "Leads";
                relatedToLeads = {
                    module:data.Entity,
                    name:record.data[0].First_Name + " " + record.data[0].Last_Name,
                    id:data.EntityId[0]
                }
            }

            if(data.Entity == "Accounts"){
                timesheetRecordName = record.data[0].Account_Name + " - " + currentDate;
                moduleName.innerText = "Members";
                relatedToAccounts ={
                    module:data.Entity,
                    name:record.data[0].Account_Name,
                    id:data.EntityId[0]
                }
            }
        });
    }
})
/*
* Initialize the widget.
*/
ZOHO.embeddedApp.init();