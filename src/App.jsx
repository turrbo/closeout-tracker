import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
  X,
  Users,
  ClipboardList,
} from "lucide-react";
import "./App.css";

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

function groupByFR(rows) {
  const groups = {};
  rows.forEach((r) => {
    const fr = r["FR Assigned"] || "Unassigned";
    if (!groups[fr]) groups[fr] = [];
    groups[fr].push(r);
  });
  return groups;
}

function extractFRName(fr) {
  const m = fr.match(/^(.+?)\s*\(/);
  return m ? m[1].trim() : fr;
}

function buildTextReminder(frFull, cases, userName) {
  const frName = extractFRName(frFull);
  const plural = cases.length > 1;

  let msg = `Hi ${frName},\n\n`;
  msg += `This is a reminder that the following case${plural ? "s" : ""} assigned to you ${plural ? "are" : "is"} currently in CLOSE OUT status and require${plural ? "" : "s"} your immediate attention:\n\n`;

  cases.forEach((c, i) => {
    msg += `${plural ? `${i + 1}. ` : ""}Control #: ${c["Control #"]}\n`;
    msg += `   Customer: ${c["Customer Name #"]}\n`;
    msg += `   State: ${c["State"]}\n`;
    if (c["Date Submitted To Web"])
      msg += `   Date Submitted: ${c["Date Submitted To Web"]}\n`;
    if (c["Date Returned"])
      msg += `   Date Returned: ${c["Date Returned"]}\n`;
    msg += `   Field Status: ${c["Field Status"]}\n\n`;
  });

  msg += `Please review and take the necessary steps to complete the close out process as soon as possible.\n\n`;
  msg += `DISCLAIMER: If you are unsure of the next steps, please reach out to ${userName || "[Your Name]"} for guidance.\n\n`;
  msg += `Thank you,\n${userName || "[Your Name]"}`;

  return msg;
}

function buildEmail(frFull, cases, userName, userEmail) {
  const frName = extractFRName(frFull);
  const count = cases.length;
  const plural = count > 1;
  const controlNums = cases.map((c) => c["Control #"]).join(", ");

  const subject = `ACTION REQUIRED: Close Out ${plural ? `Cases (${count})` : "Case"} - ${controlNums}`;

  let body = `Dear ${frName},\n\n`;
  body += `I hope this message finds you well. I am reaching out regarding ${plural ? `${count} cases` : "a case"} currently assigned to you that ${plural ? "are" : "is"} in CLOSE OUT status. ${plural ? "These cases require" : "This case requires"} your immediate attention.\n\n`;
  body += `${"=".repeat(60)}\n`;
  body += `CASES REQUIRING CLOSE OUT ACTION\n`;
  body += `${"=".repeat(60)}\n\n`;

  cases.forEach((c, i) => {
    if (plural) body += `--- Case ${i + 1} of ${count} ---\n`;
    body += `Control #:      ${c["Control #"]}\n`;
    body += `Customer:       ${c["Customer Name #"]}\n`;
    body += `State:          ${c["State"]}\n`;
    body += `Survey Type:    ${c["Survey Type"]}\n`;
    if (c["Date Submitted To Web"])
      body += `Date Submitted: ${c["Date Submitted To Web"]}\n`;
    if (c["Date Returned"])
      body += `Date Returned:  ${c["Date Returned"]}\n`;
    body += `Field Status:   ${c["Field Status"]}\n\n`;
  });

  body += `${"=".repeat(60)}\n\n`;
  body += `Please review the above ${plural ? "cases" : "case"} and take the necessary steps to complete the close out process at your earliest convenience. Timely resolution is important to ensure compliance and avoid any delays.\n\n`;
  body += `DISCLAIMER: If you are unsure of the next steps or need any clarification on the close out process, please do not hesitate to reach out to ${userName || "[Your Name]"}${userEmail ? ` (${userEmail})` : ""} directly for guidance.\n\n`;
  body += `Thank you for your prompt attention to this matter.\n\n`;
  body += `Best regards,\n${userName || "[Your Name]"}${userEmail ? `\n${userEmail}` : ""}`;

  return { subject, body };
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={handleCopy} title="Copy to clipboard">
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function FRCard({ frFull, cases, userName, userEmail, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState("text");
  const frName = extractFRName(frFull);
  const frId = frFull.match(/\((\d+)\)/)?.[1] || "";

  const textMsg = buildTextReminder(frFull, cases, userName);
  const email = buildEmail(frFull, cases, userName, userEmail);

  return (
    <div className={`fr-card ${open ? "open" : ""}`}>
      <div className="fr-card-header" onClick={() => setOpen(!open)}>
        <div className="fr-card-title">
          <Users size={18} />
          <span className="fr-name">{frName}</span>
          {frId && <span className="fr-id">#{frId}</span>}
          <span className="case-badge">
            {cases.length} case{cases.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="fr-card-controls">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>
      {open && (
        <div className="fr-card-body">
          <div className="case-table-wrap">
            <table className="case-table">
              <thead>
                <tr>
                  <th>Control #</th>
                  <th>Customer</th>
                  <th>State</th>
                  <th>Date Submitted</th>
                  <th>Date Returned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c, i) => (
                  <tr key={i}>
                    <td className="mono">{c["Control #"]}</td>
                    <td>{c["Customer Name #"]}</td>
                    <td className="center">{c["State"]}</td>
                    <td className="center">{c["Date Submitted To Web"] || "N/A"}</td>
                    <td className="center">{c["Date Returned"] || "N/A"}</td>
                    <td>
                      <span className="status-pill">{c["Field Status"]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="message-tabs">
            <button
              className={`msg-tab ${tab === "text" ? "active" : ""}`}
              onClick={() => setTab("text")}
            >
              <MessageSquare size={14} /> Text Reminder
            </button>
            <button
              className={`msg-tab ${tab === "email" ? "active" : ""}`}
              onClick={() => setTab("email")}
            >
              <Mail size={14} /> Email
            </button>
          </div>

          {tab === "text" && (
            <div className="message-block">
              <div className="message-header">
                <span>Text / SMS Reminder</span>
                <CopyButton text={textMsg} />
              </div>
              <pre className="message-content">{textMsg}</pre>
            </div>
          )}

          {tab === "email" && (
            <div className="message-block">
              <div className="message-header">
                <span>Email</span>
                <CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} />
              </div>
              <div className="email-subject">
                <strong>Subject:</strong> {email.subject}
                <CopyButton text={email.subject} />
              </div>
              <pre className="message-content">{email.body}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const processFile = useCallback((file) => {
    setError("");
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setError("Please upload an Excel file (.xlsx, .xls) or CSV file.");
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseExcel(e.target.result);
        if (!rows.length) {
          setError("The file appears to be empty.");
          return;
        }
        const required = ["Control #", "FR Assigned", "Customer Name #", "Field Status", "Survey Type"];
        const cols = Object.keys(rows[0]);
        const missing = required.filter((r) => !cols.includes(r));
        if (missing.length) {
          setError(`Missing required columns: ${missing.join(", ")}`);
          return;
        }
        const closeOuts = rows.filter(
          (r) => (r["Survey Type"] || "").toLowerCase().includes("close out")
        );
        if (!closeOuts.length) {
          setError("No cases in Close Out status found in the file.");
          return;
        }
        setData({
          allRows: rows,
          closeOuts,
          grouped: groupByFR(closeOuts),
        });
      } catch {
        setError("Failed to parse the file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleReset = () => {
    setData(null);
    setFileName("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const frKeys = data ? Object.keys(data.grouped).sort() : [];

  return (
    <div className="app">
      <header className="top-bar">
        <div className="top-bar-inner">
          <div className="logo">
            <ClipboardList size={22} />
            <span>Close Out Case Tracker</span>
          </div>
          {data && (
            <div className="top-bar-file">
              <FileSpreadsheet size={16} />
              {fileName}
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        {!data ? (
          <div className="upload-section">
            <div className="settings-panel">
              <h3>Your Information</h3>
              <p className="settings-desc">
                This will appear in generated messages so field reps know who to contact.
              </p>
              <div className="settings-fields">
                <div className="field-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Smith"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label>Your Email (optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. jane.smith@company.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                type="file"
                ref={fileRef}
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={(e) => processFile(e.target.files?.[0])}
              />
              <Upload size={44} strokeWidth={1.5} />
              <h2>Upload Close Out Report</h2>
              <p>Drag & drop your Excel file here, or click to browse</p>
              <p className="file-types">Supports .xlsx, .xls, .csv</p>
            </div>

            {error && (
              <div className="error-banner">
                <AlertTriangle size={16} /> {error}
              </div>
            )}
          </div>
        ) : (
          <div className="results-section">
            <div className="results-header">
              <div className="results-info">
                <div>
                  <h2>Close Out Cases</h2>
                  <p>
                    {data.closeOuts.length} case{data.closeOuts.length !== 1 ? "s" : ""}{" "}
                    across {frKeys.length} field rep{frKeys.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button className="reset-btn" onClick={handleReset}>
                <X size={16} /> Upload New File
              </button>
            </div>

            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-value">{data.closeOuts.length}</div>
                <div className="summary-label">Total Cases</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">{frKeys.length}</div>
                <div className="summary-label">Field Reps</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">
                  {[...new Set(data.closeOuts.map((c) => c["State"]))].length}
                </div>
                <div className="summary-label">States</div>
              </div>
              <div className="summary-card urgent">
                <AlertTriangle size={18} />
                <div className="summary-value">Immediate</div>
                <div className="summary-label">Action Required</div>
              </div>
            </div>

            <h3 className="section-title">Messages by Field Rep</h3>
            <p className="section-desc">
              Each field rep below has a pre-generated text reminder and email combining all their close out cases. Click to expand and copy.
            </p>

            <div className="fr-list">
              {frKeys.map((fr, idx) => (
                <FRCard
                  key={fr}
                  frFull={fr}
                  cases={data.grouped[fr]}
                  userName={userName}
                  userEmail={userEmail}
                  defaultOpen={idx === 0}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
