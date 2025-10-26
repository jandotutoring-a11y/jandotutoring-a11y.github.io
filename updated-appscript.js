function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Debug: Log all incoming parameters
  Logger.log('🔍 DoGet called with parameters: ' + JSON.stringify(e.parameter));

  // 1️⃣ Teacher: list available game sheets
  if (e.parameter.games === "list") {
    var games = ss.getSheets()
      .map(sh => sh.getName())
      .filter(n => n !== "Students" && n !== "Learning_Modules" && n !== "Student_Progress" && n !== "Step_Details");
    return jsonResponse(games);
  }

  // 2️⃣ Teacher: fetch results from one sheet
  if (e.parameter.sheet) {
    var sh = ss.getSheetByName(e.parameter.sheet);
    if (!sh) return jsonResponse([]);

    var data = sh.getDataRange().getValues();
    if (data.length < 2) return jsonResponse([]);

    var rows = [];
    var sheetName = sh.getName();

    // Responses sheet mapping
    if (sheetName.includes(".Responses")) {
      for (var i = 1; i < data.length; i++) {
        rows.push({
          Game: data[i][0],
          Name: data[i][1],
          Code: data[i][2],
          Question: data[i][3],
          CorrectAnswer: data[i][4],
          StudentAnswer: data[i][5],
          Result: data[i][6],
          Date: data[i][7],
          Time: data[i][8]
        });
      }
    } else { // Summary sheet mapping
      for (var j = 1; j < data.length; j++) {
        rows.push({
          Game: data[j][0],
          Name: data[j][1],
          Code: data[j][2],
          Score: data[j][3],
          Date: data[j][4],
          Time: data[j][5]
        });
      }
    }

    return jsonResponse(rows);
  }

  // 3️⃣ Teacher: fetch all results across all summary sheets
  if (e.parameter.all === "true") {
    var all = [];
    ss.getSheets().forEach(sh => {
      var n = sh.getName();
      if (n === "Students" || n === "Learning_Modules" || n === "Student_Progress" || n === "Step_Details" || n.includes(".Responses")) return;
      var data = sh.getDataRange().getValues();
      if (data.length < 2) return;
      for (var r = 1; r < data.length; r++) {
        all.push({
          Game: data[r][0],
          Name: data[r][1],
          Code: data[r][2],
          Score: data[r][3],
          Date: data[r][4],
          Time: data[r][5]
        });
      }
    });
    return jsonResponse(all);
  }

  // 🆕 4️⃣ Fetch available learning modules for a year level
  if (e.parameter.modules && e.parameter.year) {
    var modulesSheet = ss.getSheetByName("Learning_Modules");
    if (!modulesSheet) return jsonResponse([]);

    var data = modulesSheet.getDataRange().getValues();
    if (data.length < 2) return jsonResponse([]);

    var modules = [];
    var yearLevel = String(e.parameter.year);

    for (var i = 1; i < data.length; i++) {
      var moduleYear = String(data[i][3]); // Year_Level column
      var status = String(data[i][8]); // Status column
      
      if (moduleYear === yearLevel && status === "Active") {
        modules.push({
          moduleId: data[i][0],      // Module_ID
          moduleName: data[i][1],    // Module_Name
          subject: data[i][2],       // Subject
          yearLevel: data[i][3],     // Year_Level
          description: data[i][4],   // Description
          totalSteps: data[i][5],    // Total_Steps
          videoId: data[i][6],       // Video_ID
          gameLink: data[i][7],      // Game_Link
          status: data[i][8]         // Status
        });
      }
    }

    return jsonResponse(modules);
  }

  // 🆕 5️⃣ Fetch student progress for all modules
  if (e.parameter.progress && e.parameter.code) {
    var progressSheet = ss.getSheetByName("Student_Progress");
    if (!progressSheet) return jsonResponse([]);

    var data = progressSheet.getDataRange().getValues();
    if (data.length < 2) return jsonResponse([]);

    var progress = [];
    var studentCode = String(e.parameter.code).trim();

    for (var i = 1; i < data.length; i++) {
      var sheetCode = String(data[i][0]).trim(); // Student_Code
      if (sheetCode.toLowerCase() === studentCode.toLowerCase()) {
        progress.push({
          studentCode: data[i][0],        // Student_Code
          moduleId: data[i][1],           // Module_ID
          stepsCompleted: data[i][2] || "", // Steps_Completed
          totalSteps: data[i][3] || 0,    // Total_Steps
          progressPercentage: data[i][4] || 0, // Progress_Percentage
          currentStep: data[i][5] || 1,   // Current_Step
          startedDate: data[i][6] || "",  // Started_Date
          lastUpdated: data[i][7] || "",  // Last_Updated
          completedDate: data[i][8] || "", // Completed_Date
          timeSpentMinutes: data[i][9] || 0 // Time_Spent_Minutes
        });
      }
    }

    return jsonResponse(progress);
  }

  // 6️⃣ Student login: validate code and return full student data (only if not a quiz submission)
  if (e.parameter.code && !e.parameter.action) {
    var studentSheet = ss.getSheetByName("Students");
    if (!studentSheet) return ContentService.createTextOutput("Invalid");

    var code = String(e.parameter.code).trim();
    var lastRow = studentSheet.getLastRow();
    if (lastRow < 2) return ContentService.createTextOutput("Invalid");

    // Get all student data including new columns (A-G)
    var values = studentSheet.getRange(2, 1, lastRow - 1, 7).getValues();

    for (var i = 0; i < values.length; i++) {
      var sheetCode = String(values[i][1]).trim(); // Column B - Code
      if (sheetCode.toLowerCase() === code.toLowerCase()) {
        var studentData = {
          name: String(values[i][0]).trim(),      // Column A - Name
          code: String(values[i][1]).trim(),     // Column B - Code
          rewards: values[i][2] || "",           // Column C - Rewards
          yearLevel: values[i][3] || "",         // Column D - Year Level
          lastLogin: values[i][4] || "",         // Column E - Last Login
          totalGames: values[i][5] || 0,         // Column F - Total Games
          totalScore: values[i][6] || 0          // Column G - Total Score
        };
        
        // Update last login timestamp
        var now = new Date();
        var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
        studentSheet.getRange(i + 2, 5).setValue(timestamp); // Column E - Last Login
        
        return ContentService
          .createTextOutput(JSON.stringify(studentData))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput("Invalid");
  }

  // 7️⃣ Fetch rewards for a student
  if (e.parameter.rewards) {
    var studentSheet = ss.getSheetByName("Students");
    if (!studentSheet) return jsonResponse({ name: "", code: "", rewards: "" });

    var code = String(e.parameter.rewards).trim();
    var lastRow = studentSheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ name: "", code: "", rewards: "" });

    var data = studentSheet.getRange(2, 1, lastRow - 1, 3).getValues(); // Get A, B, C
    for (var i = 0; i < data.length; i++) {
      var studentName = String(data[i][0]).trim();    // Column A - Name
      var studentCode = String(data[i][1]).trim();    // Column B - Code
      var studentRewards = data[i][2] || "";          // Column C - Rewards

      if (studentCode.toLowerCase() === code.toLowerCase()) {
        return jsonResponse({ 
          name: studentName, 
          code: studentCode,
          rewards: studentRewards 
        });
      }
    }

    return jsonResponse({ name: "", code: "", rewards: "" });
  }

  // 8️⃣ Handle quiz submissions via GET request (CORS-friendly)
  if (e.parameter.action === "saveQuiz") {
    Logger.log('🎯 QUIZ SAVE SECTION TRIGGERED - Action parameter: ' + e.parameter.action);
    try {
      var studentCode = e.parameter.code;
      var moduleId = e.parameter.moduleId;
      var score = parseInt(e.parameter.score) || 0;
      var totalQuestions = parseInt(e.parameter.totalQuestions) || 0;
      
      Logger.log('Quiz submission received: Code=' + studentCode + ', Module=' + moduleId + ', Score=' + score + ', Total=' + totalQuestions);
      Logger.log('Raw responses parameter: ' + e.parameter.responses);
      Logger.log('All parameters: ' + JSON.stringify(e.parameter));
      
      // Validate required parameters
      if (!studentCode) {
        throw new Error('Missing student code');
      }
      if (!moduleId) {
        throw new Error('Missing module ID');
      }
      
      var responses = [];
      if (e.parameter.responses) {
        try {
          responses = JSON.parse(decodeURIComponent(e.parameter.responses));
          Logger.log('Parsed responses: ' + responses.length + ' items');
          // Log the structure of the first response to debug
          if (responses.length > 0) {
            Logger.log('Sample response structure: ' + JSON.stringify(responses[0]));
          }
        } catch (parseError) {
          Logger.log('Error parsing responses: ' + parseError.message);
          // Continue without responses if parsing fails
        }
      }
      
      // Try both possible sheet names you might have created
      var quizSheet = ss.getSheetByName("Quiz-Results") || ss.getSheetByName("Quiz_Results");
      if (!quizSheet) {
        Logger.log('Quiz sheet not found, creating Quiz-Results sheet');
        quizSheet = ss.insertSheet("Quiz-Results");
        quizSheet.appendRow(["Module_ID", "Student_Name", "Student_Code", "Score", "Total_Questions", "Percentage", "Date", "Time"]);
        Logger.log('Quiz-Results sheet created with headers');
      } else {
        Logger.log('Found existing quiz sheet: ' + quizSheet.getName());
      }
      
      // Try both possible response sheet names you might have created
      var responsesSheet = ss.getSheetByName("Quiz_Results.Responses") || ss.getSheetByName("Quiz-Results.Responses");
      if (!responsesSheet) {
        Logger.log('Responses sheet not found, creating Quiz_Results.Responses sheet');
        responsesSheet = ss.insertSheet("Quiz_Results.Responses");
        responsesSheet.appendRow(["Module_ID", "Student_Name", "Student_Code", "Question_Number", "Question", "Correct_Answer", "Student_Answer", "Is_Correct", "Date", "Time"]);
        Logger.log('Quiz_Results.Responses sheet created with headers');
      } else {
        Logger.log('Found existing responses sheet: ' + responsesSheet.getName());
      }
      
      // Find student name
      var studentSheet = ss.getSheetByName("Students");
      var studentName = "Unknown";
      if (studentSheet) {
        var students = studentSheet.getRange(2, 1, studentSheet.getLastRow() - 1, 2).getValues();
        for (var i = 0; i < students.length; i++) {
          if (String(students[i][1]).trim().toLowerCase() === String(studentCode).trim().toLowerCase()) {
            studentName = students[i][0];
            break;
          }
        }
      }
      
      // Calculate percentage
      var percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
      
      // Format date and time
      var now = new Date();
      var date = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy");
      var time = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
      
      // Save summary to Quiz-Results
      Logger.log('Saving quiz summary: ' + moduleId + ', ' + studentName + ', Score: ' + score + '/' + totalQuestions);
      quizSheet.appendRow([
        moduleId,
        studentName,
        studentCode,
        score,
        totalQuestions,
        percentage + "%",
        date,
        time
      ]);
      
      // Save detailed responses to appropriate responses sheet
      Logger.log('Saving ' + responses.length + ' quiz responses');
      responses.forEach(function(response, index) {
        // Handle both property name formats (answer/correct vs studentAnswer/correctAnswer)
        var rawStudentAnswer = response.studentAnswer || response.answer;
        var rawCorrectAnswer = response.correctAnswer || response.correct;
        
        // Preserve original values but ensure they're not undefined
        var studentAnswer = (rawStudentAnswer !== undefined && rawStudentAnswer !== null) ? rawStudentAnswer : '';
        var correctAnswer = (rawCorrectAnswer !== undefined && rawCorrectAnswer !== null) ? rawCorrectAnswer : '';
        
        // For boolean values, convert to string for comparison
        if (typeof rawStudentAnswer === 'boolean') studentAnswer = rawStudentAnswer.toString();
        if (typeof rawCorrectAnswer === 'boolean') correctAnswer = rawCorrectAnswer.toString();
        
        var isCorrect = String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
        
        Logger.log('Response ' + (index + 1) + ': ' + response.question);
        Logger.log('  Raw Student: ' + rawStudentAnswer + ' (type: ' + typeof rawStudentAnswer + ')');
        Logger.log('  Raw Correct: ' + rawCorrectAnswer + ' (type: ' + typeof rawCorrectAnswer + ')');
        Logger.log('  Final Student: "' + studentAnswer + '"');
        Logger.log('  Final Correct: "' + correctAnswer + '"');
        Logger.log('  Match: ' + isCorrect);
        Logger.log('  Complete response: ' + JSON.stringify(response));
        
        responsesSheet.appendRow([
          moduleId,                           // Module_ID
          studentName,                        // Student_Name  
          studentCode,                        // Student_Code
          index + 1,                          // Question_Number
          response.question,                  // Question
          correctAnswer,                      // Correct_Answer
          studentAnswer,                      // Student_Answer (FIRST ATTEMPT ONLY)
          isCorrect ? "Correct" : "Incorrect", // Is_Correct
          date,                               // Date
          time                                // Time
        ]);
      });
      
      Logger.log('Quiz submission completed successfully');
      return jsonResponse({ 
        success: true, 
        message: "Quiz results saved successfully",
        score: score,
        totalQuestions: totalQuestions,
        percentage: percentage
      });
      
    } catch (error) {
      Logger.log('Error saving quiz: ' + error.message);
      Logger.log('Error details: ' + error.toString());
      Logger.log('Stack trace: ' + error.stack);
      
      var errorMessage = error.message || 'Unknown error occurred';
      if (errorMessage === 'undefined') {
        errorMessage = 'Script execution failed - check permissions and sheet setup';
      }
      
      return jsonResponse({ 
        success: false, 
        message: "Quiz save failed: " + errorMessage,
        errorType: error.name || 'UnknownError'
      });
    }
  }

  // 🔧 Debug endpoint to test connection
  if (e.parameter.test === "connection") {
    Logger.log('Test connection request received');
    var sheets = ss.getSheets().map(function(sheet) { 
      return sheet.getName(); 
    });
    return jsonResponse({ 
      success: true, 
      message: "Connection successful", 
      availableSheets: sheets,
      timestamp: new Date().toISOString()
    });
  }

  // Default return
  return jsonResponse([]);
}

function doPost(e) {
  try {
    Logger.log('📝 DoPost called');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    
    Logger.log('📊 Received data: ' + JSON.stringify(data));

    // 🆕 Handle learning module progress updates
    if (data.action === "updateProgress") {
      return updateModuleProgress(ss, data);
    }

    var code = data.code;
    var score = data.score;
    var game = data.game;
    var sheetName = data.sheet || "Results";
    var responses = data.responses || [];
    
    Logger.log('🎯 Processing game: ' + game + ' for student: ' + code + ' with score: ' + score + ' to sheet: ' + sheetName);

    var studentSheet = ss.getSheetByName("Students");
    var resultsSheet = ss.getSheetByName(sheetName);
    if (!resultsSheet) {
      Logger.log('Creating new sheet: ' + sheetName);
      resultsSheet = ss.insertSheet(sheetName);
    }

    // ✅ Ensure headers for summary sheet
    if (resultsSheet.getLastRow() === 0) {
      Logger.log('Adding headers to sheet: ' + sheetName);
      resultsSheet.appendRow(["Game","Name","Code","Score","Date","Time"]);
    }

    // ✅ Find student name and update their stats
    var studentName = "Unknown";
    var studentRow = -1;
    var students = studentSheet.getRange(2, 1, studentSheet.getLastRow()-1, 7).getValues();
    for (var i = 0; i < students.length; i++) {
      if (String(students[i][1]) === String(code)) { // Column B - Code
        studentName = students[i][0]; // Column A - Name
        studentRow = i + 2; // Actual row number in sheet
        break;
      }
    }

    // ✅ Update student statistics
    if (studentRow > 0) {
      // Update Total Games Played (Column F)
      var currentGames = studentSheet.getRange(studentRow, 6).getValue() || 0;
      // Ensure currentGames is a number
      currentGames = Number(currentGames) || 0;
      studentSheet.getRange(studentRow, 6).setValue(currentGames + 1);
      
      // Update Total Score (Column G)
      var currentScore = studentSheet.getRange(studentRow, 7).getValue() || 0;
      // Ensure both currentScore and score are numbers
      currentScore = Number(currentScore) || 0;
      var scoreToAdd = Number(score) || 0;
      
      Logger.log('Updating scores: Current=' + currentScore + ', Adding=' + scoreToAdd + ', New Total=' + (currentScore + scoreToAdd));
      studentSheet.getRange(studentRow, 7).setValue(currentScore + scoreToAdd);
    }

    // ✅ Format score, date, and time
    var total = data.totalQuestions || 5;
    var scoreStr = score + "/" + total;
    var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
    var time = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");

    // ✅ Append to summary sheet
    resultsSheet.appendRow([game, studentName, code, scoreStr, date, time]);

    // ✅ Handle detailed responses
    var respSheetName = sheetName + ".Responses";
    var respSheet = ss.getSheetByName(respSheetName);
    if (!respSheet) {
      Logger.log('Creating new responses sheet: ' + respSheetName);
      respSheet = ss.insertSheet(respSheetName);
      respSheet.appendRow(["Game","Name","Code","Question","CorrectAnswer","StudentAnswer","Result","Date","Time"]);
    }

    responses.forEach(r => {
      var result = (String(r.answer) === String(r.correct)) ? "Correct" : "Incorrect";
      respSheet.appendRow([
        game,
        studentName,
        code,
        r.question,
        r.correct,
        r.answer,
        result,
        date,
        time
      ]);
    });

    // ✅ Handle reward updates
    if (data.reward) {
      var studentSheet = ss.getSheetByName("Students");
      var codes = studentSheet.getRange(2, 2, studentSheet.getLastRow() - 1, 1).getValues(); // Column B
      
      for (var i = 0; i < codes.length; i++) {
        if (String(codes[i][0]).trim() === String(code).trim()) {
          var row = i + 2;
          var currentRewards = studentSheet.getRange(row, 3).getValue() || ""; // Column C
          var rewardList = currentRewards ? currentRewards.split(",") : [];

          if (!rewardList.includes(data.reward)) {
            rewardList.push(data.reward);
            studentSheet.getRange(row, 3).setValue(rewardList.join(",")); // Column C
          }
          break;
        }
      }
    }

    return ContentService.createTextOutput("Success")
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// 🆕 New function to handle module progress updates
function updateModuleProgress(ss, data) {
  try {
    var progressSheet = ss.getSheetByName("Student_Progress");
    if (!progressSheet) {
      // Create the sheet if it doesn't exist
      progressSheet = ss.insertSheet("Student_Progress");
      progressSheet.appendRow([
        "Student_Code", "Module_ID", "Steps_Completed", "Total_Steps", 
        "Progress_Percentage", "Current_Step", "Started_Date", "Last_Updated", 
        "Completed_Date", "Time_Spent_Minutes"
      ]);
    }

    var studentCode = data.studentCode;
    var moduleId = data.moduleId;
    var stepNumber = data.stepNumber;
    var totalSteps = data.totalSteps || 4;

    // Find existing progress record
    var progressData = progressSheet.getDataRange().getValues();
    var existingRowIndex = -1;
    
    for (var i = 1; i < progressData.length; i++) {
      if (progressData[i][0] === studentCode && progressData[i][1] === moduleId) {
        existingRowIndex = i + 1; // Convert to 1-based row index
        break;
      }
    }

    var now = new Date();
    var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    
    if (existingRowIndex > 0) {
      // Update existing record
      var currentSteps = progressData[existingRowIndex - 1][2] || ""; // Steps_Completed
      var stepsArray = currentSteps ? currentSteps.split(",").map(s => parseInt(s)) : [];
      
      // Add new step if not already completed
      if (!stepsArray.includes(stepNumber)) {
        stepsArray.push(stepNumber);
        stepsArray.sort((a, b) => a - b); // Sort numerically
      }
      
      var stepsCompleted = stepsArray.join(",");
      var progressPercentage = Math.round((stepsArray.length / totalSteps) * 100);
      var nextStep = Math.min(...Array.from({length: totalSteps}, (_, i) => i + 1).filter(s => !stepsArray.includes(s))) || totalSteps;
      var completedDate = (progressPercentage === 100) ? timestamp : "";
      
      // Update the row
      progressSheet.getRange(existingRowIndex, 3).setValue(stepsCompleted); // Steps_Completed
      progressSheet.getRange(existingRowIndex, 5).setValue(progressPercentage); // Progress_Percentage
      progressSheet.getRange(existingRowIndex, 6).setValue(nextStep); // Current_Step
      progressSheet.getRange(existingRowIndex, 8).setValue(timestamp); // Last_Updated
      if (completedDate) {
        progressSheet.getRange(existingRowIndex, 9).setValue(completedDate); // Completed_Date
      }
      
    } else {
      // Create new record
      var stepsCompleted = String(stepNumber);
      var progressPercentage = Math.round((1 / totalSteps) * 100);
      var nextStep = stepNumber + 1;
      var completedDate = (progressPercentage === 100) ? timestamp : "";
      
      progressSheet.appendRow([
        studentCode,        // Student_Code
        moduleId,          // Module_ID
        stepsCompleted,    // Steps_Completed
        totalSteps,        // Total_Steps
        progressPercentage, // Progress_Percentage
        nextStep,          // Current_Step
        timestamp,         // Started_Date
        timestamp,         // Last_Updated
        completedDate,     // Completed_Date
        0                  // Time_Spent_Minutes
      ]);
    }

    // Also log to Step_Details sheet for granular tracking
    var stepSheet = ss.getSheetByName("Step_Details");
    if (!stepSheet) {
      stepSheet = ss.insertSheet("Step_Details");
      stepSheet.appendRow([
        "Student_Code", "Module_ID", "Step_Number", "Step_Name", 
        "Completed", "Completed_Timestamp", "Attempts"
      ]);
    }

    // Check if this step completion already exists
    var stepData = stepSheet.getDataRange().getValues();
    var stepExists = false;
    for (var j = 1; j < stepData.length; j++) {
      if (stepData[j][0] === studentCode && 
          stepData[j][1] === moduleId && 
          stepData[j][2] === stepNumber) {
        stepExists = true;
        break;
      }
    }

    if (!stepExists) {
      stepSheet.appendRow([
        studentCode,       // Student_Code
        moduleId,         // Module_ID
        stepNumber,       // Step_Number
        data.stepName || "Step " + stepNumber, // Step_Name
        true,             // Completed
        timestamp,        // Completed_Timestamp
        1                 // Attempts
      ]);
    }

    return ContentService.createTextOutput("Progress Updated")
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput("Error updating progress: " + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function doPut(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    var sheetName = data.sheet;
    var rowIndex = data.row;   // 1-based row index
    var newScore = data.newScore;

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return ContentService.createTextOutput("Error: Sheet not found")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Get headers
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var col = headers.indexOf("Score") + 1;
    if (col === 0) {
      return ContentService.createTextOutput("Error: No 'Score' column found")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Update score in the given row
    sheet.getRange(rowIndex, col).setValue(newScore);

    return ContentService.createTextOutput("Updated")
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// Helper function
function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}