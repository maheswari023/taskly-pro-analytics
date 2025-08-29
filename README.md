# 📊 Taskly Pro — Analytics Edition  

Taskly Pro is a **Task Management + Data Analytics Dashboard** built using **HTML, CSS, and JavaScript**.  
It simulates a real **data pipeline**: collection → cleaning → querying → analysis → visualization → reporting.  

The project also features a **dark/light theme UI** styled with modern gradients and cards.  

---

## 🚀 Features  

### ✅ Task Management  
- Add, complete, and delete tasks  
- Search and filter by category or status  
- LocalStorage persistence  

### 🧹 Data Cleaning  
- Remove duplicate tasks  
- Auto-fill missing categories  
- Clean log history  

### 📊 Analytics Dashboard  
- **Completion Rate** (doughnut chart)  
- **Category Distribution** (pie chart)  
- **Task Activity Trends** (bar chart over 7 days)  
- Filter charts by category  

### 🔎 SQL-like Query Engine  
Run queries such as:  
```sql
-- All Work tasks not completed
SELECT * FROM tasks WHERE category = 'Work' AND completed = false;

📤 Export Options

Export tasks to CSV (spreadsheet ready)

Generate Analytics Report (TXT)

🎨 Modern UI / UX

Dark & Light themes (.light class in CSS)

Gradient backgrounds, card layout

Responsive dashboard grid

🛠️ Tech Stack

HTML5 / CSS3 / JavaScript

-- Tasks with 'Study' in the title
SELECT * FROM tasks WHERE title LIKE '%Study%';
