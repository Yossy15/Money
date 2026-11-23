const DEFAULT_DATA = {
  station_cu: "Nov_2026",
  Stations: {
    Nov_2026: {
      Money: { Salary: 23000, OT: 0, OtherIncome: 0 },
      Expenses: [
        { id: "e1", name: "ค่าห้อง", amount: 3900, category: "Housing" },
        { id: "e2", name: "ค่าน้ำ + ค่าไฟ", amount: 3000, category: "Utilities" },
        { id: "e3", name: "โอนให้แม่", amount: 2000, category: "Family" },
        { id: "e4", name: "ค่าผ่อนรถ", amount: 6000, category: "Vehicle" },
        { id: "e5", name: "ค่าเน็ต", amount: 400, category: "Internet" },
        { id: "e6", name: "ค่าซื้อของเข้าห้อง", amount: 1500, category: "Shopping" },
        { id: "e7", name: "ค่ารถ", amount: 900, category: "Transportation" },
        { id: "e8", name: "ค่าอาหารเช้า", amount: 1500, category: "Food" },
        { id: "e9", name: "ค่าพักรถ / น้ำมัน", amount: 1200, category: "Transportation" },
        { id: "e10", name: "ค่า ตต.", amount: 1000, category: "Personal" }
      ],
      Savings: 3000
    },
    Dec_2026: {
      Money: { Salary: 23000, OT: 0, OtherIncome: 0 },
      Expenses: [],
      Savings: 3000
    }
  }
};

const $ = (id) => document.getElementById(id);
let data = structuredClone(DEFAULT_DATA);
let toastTimer;

const money = (value) => new Intl.NumberFormat("th-TH", {
  style: "currency", currency: "THB", maximumFractionDigits: 0
}).format(Number(value) || 0);
const currentStation = () => data.Stations[data.station_cu];
const num = (value) => Math.max(0, Number(value) || 0);
const totalExpense = (station) => station.Expenses.reduce((sum, item) => sum + num(item.amount), 0);
const totalIncome = (station) => num(station.Money.Salary) + num(station.Money.OT) + num(station.Money.OtherIncome);

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200);
}

function normalizeData(parsed) {
  if (!parsed || typeof parsed !== "object" || !parsed.Stations || typeof parsed.Stations !== "object") {
    throw new Error("รูปแบบ JSON ไม่ถูกต้อง: ต้องมี Stations เป็น object");
  }
  const keys = Object.keys(parsed.Stations);
  if (!keys.length) throw new Error("ไม่พบข้อมูลเดือนใน Stations");
  if (!parsed.station_cu || !parsed.Stations[parsed.station_cu]) parsed.station_cu = keys[0];
  for (const [key, station] of Object.entries(parsed.Stations)) {
    if (!station || typeof station !== "object") throw new Error(`ข้อมูล ${key} ไม่ถูกต้อง`);
    station.Money ??= { Salary: 0, OT: 0, OtherIncome: 0 };
    station.Money.Salary = num(station.Money.Salary);
    station.Money.OT = num(station.Money.OT);
    station.Money.OtherIncome = num(station.Money.OtherIncome);
    station.Expenses = Array.isArray(station.Expenses) ? station.Expenses : [];
    station.Expenses = station.Expenses.map((e, i) => ({
      id: e.id || `import-${key}-${i}-${Date.now()}`,
      name: String(e.name || "รายการไม่มีชื่อ"),
      amount: num(e.amount),
      category: String(e.category || "Other")
    }));
    station.Savings = num(station.Savings);
  }
  return parsed;
}

function renderMonthSelect() {
  const select = $("monthSelect");
  select.innerHTML = "";
  Object.keys(data.Stations).forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key.replace("_", " ");
    select.append(option);
  });
  select.value = data.station_cu;
}

function render() {
  const s = currentStation();
  if (!s) return;
  $("salaryInput").value = s.Money.Salary;
  $("otInput").value = s.Money.OT;
  $("otherInput").value = s.Money.OtherIncome;
  $("savingsInput").value = s.Savings;
  const income = totalIncome(s);
  const expenses = totalExpense(s);
  const balance = income - expenses - s.Savings;
  $("totalIncome").textContent = money(income);
  $("totalExpenses").textContent = money(expenses);
  $("totalSavings").textContent = money(s.Savings);
  $("balance").textContent = money(balance);
  $("balance").style.color = balance < 0 ? "var(--red)" : "var(--green)";
  $("tableTotal").textContent = money(expenses);

  const [monthPart, yearPart] = data.station_cu.split("_");
  const monthIndex = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(monthPart);
  const daysInMonth = monthIndex >= 0 ? new Date(Number(yearPart), monthIndex + 1, 0).getDate() : 30;
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === Number(yearPart) && now.getMonth() === monthIndex;
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : daysInMonth;
  const daily = Math.max(0, balance) / daysLeft;
  $("dailyBudget").textContent = money(daily);
  $("dailyCaption").textContent = `คำนวณจากเงินคงเหลือ ÷ ${daysLeft} วันที่ใช้วางแผน`;
  $("monthDays").textContent = `เดือนนี้มี ${daysInMonth} วัน · ใช้คำนวณ ${daysLeft} วัน`;
  const percent = income > 0 ? Math.min(100, Math.round(expenses / income * 100)) : 0;
  $("budgetProgress").style.width = `${percent}%`;
  $("budgetProgress").style.background = percent >= 100 ? "var(--red)" : "var(--green)";
  $("expensePercent").textContent = `${percent}% ของรายรับ`;

  const tbody = $("expenseRows");
  tbody.innerHTML = "";
  $("emptyState").hidden = s.Expenses.length !== 0;
  s.Expenses.forEach(item => {
    const tr = document.createElement("tr");
    const name = document.createElement("td"); name.textContent = item.name;
    const category = document.createElement("td");
    const badge = document.createElement("span"); badge.className = "category"; badge.textContent = categoryName(item.category); category.append(badge);
    const amount = document.createElement("td"); amount.className = "right"; amount.textContent = money(item.amount);
    const actions = document.createElement("td"); actions.className = "right";
    const wrap = document.createElement("div"); wrap.className = "row-actions";
    const edit = document.createElement("button"); edit.className = "icon-btn"; edit.textContent = "แก้ไข"; edit.type = "button"; edit.addEventListener("click", () => editExpense(item.id));
    const del = document.createElement("button"); del.className = "icon-btn delete"; del.textContent = "ลบ"; del.type = "button"; del.addEventListener("click", () => deleteExpense(item.id));
    wrap.append(edit, del); actions.append(wrap); tr.append(name, category, amount, actions); tbody.append(tr);
  });
  $("saveStatus").textContent = "แก้ไขข้อมูลแล้ว · กด “บันทึก JSON” เพื่อดาวน์โหลดไฟล์ข้อมูลล่าสุด";
}

function categoryName(key) {
  return ({Housing:"ที่พัก",Utilities:"น้ำ / ไฟ",Vehicle:"รถ",Food:"อาหาร",Transportation:"เดินทาง",Family:"ครอบครัว",Internet:"อินเทอร์เน็ต",Shopping:"ซื้อของ",Personal:"ส่วนตัว",Other:"อื่น ๆ"})[key] || key;
}
function syncFields() {
  const s = currentStation();
  s.Money.Salary = num($("salaryInput").value);
  s.Money.OT = num($("otInput").value);
  s.Money.OtherIncome = num($("otherInput").value);
  s.Savings = num($("savingsInput").value);
  render();
}
["salaryInput","otInput","otherInput","savingsInput"].forEach(id => $(id).addEventListener("input", syncFields));

$("monthSelect").addEventListener("change", e => {
  data.station_cu = e.target.value;
  render();
});
$("importBtn").addEventListener("click", () => $("fileInput").click());
$("fileInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    data = normalizeData(parsed);
    renderMonthSelect(); render();
    showToast("อ่านไฟล์ JSON สำเร็จ");
  } catch (error) {
    alert(`ไม่สามารถอ่าน JSON ได้\n${error.message}`);
  }
  e.target.value = "";
});
$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "yossy_money_manager.json"; a.click();
  URL.revokeObjectURL(url);
  showToast("ดาวน์โหลด JSON แล้ว");
});
$("addExpenseBtn").addEventListener("click", () => {
  $("expenseForm").hidden = false;
  $("expenseId").value = "";
  $("expenseForm").reset();
  $("expenseName").focus();
});
$("cancelExpenseBtn").addEventListener("click", () => { $("expenseForm").hidden = true; });
$("expenseForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = $("expenseId").value;
  const item = {
    id: id || `e-${Date.now()}`,
    name: $("expenseName").value.trim(),
    amount: num($("expenseAmount").value),
    category: $("expenseCategory").value
  };
  if (!item.name) return;
  const expenses = currentStation().Expenses;
  if (id) {
    const index = expenses.findIndex(x => x.id === id);
    if (index >= 0) expenses[index] = item;
  } else expenses.push(item);
  $("expenseForm").hidden = true;
  render();
  showToast(id ? "แก้ไขรายจ่ายแล้ว" : "เพิ่มรายจ่ายแล้ว");
});
function editExpense(id) {
  const item = currentStation().Expenses.find(x => x.id === id);
  if (!item) return;
  $("expenseId").value = item.id;
  $("expenseName").value = item.name;
  $("expenseAmount").value = item.amount;
  $("expenseCategory").value = item.category;
  $("expenseForm").hidden = false;
  $("expenseName").focus();
}
function deleteExpense(id) {
  const item = currentStation().Expenses.find(x => x.id === id);
  if (!item || !confirm(`ต้องการลบ "${item.name}" หรือไม่?`)) return;
  currentStation().Expenses = currentStation().Expenses.filter(x => x.id !== id);
  render(); showToast("ลบรายการแล้ว");
}

renderMonthSelect();
render();
