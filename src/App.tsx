import { useState, useEffect, useRef } from "react";
import { 
  WorkflowState, 
  BookingFacts, 
  RuntimeSession, 
  RuntimeEvent, 
  PromptTelemetry, 
  ActionQueueItem,
  ChatMessage
} from "./types";
import { 
  Send, 
  RotateCcw, 
  Database, 
  Activity, 
  Clock, 
  FileText, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Terminal,
  Zap,
  Phone,
  Play,
  Shield,
  Layers,
  Sparkles,
  Info,
  Edit3,
  Check,
  X
} from "lucide-react";

interface ReplayStep {
  input_text: string;
  timestamp: string;
  intent: string;
  newly_extracted: BookingFacts;
  simulated_facts: BookingFacts;
  historical_facts: BookingFacts;
  simulated_state: string;
  historical_state: string;
  discrepancy: boolean;
}

interface ReplayResponse {
  session_id: string;
  replayed_steps: ReplayStep[];
  final_reconstructed_state: string;
  final_reconstructed_facts: BookingFacts;
  total_steps: number;
  has_discrepancies: boolean;
}

export default function App() {
  const [sessions, setSessions] = useState<RuntimeSession[]>([]);
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [telemetry, setTelemetry] = useState<PromptTelemetry[]>([]);
  const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("demo-session-id-123456789");
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "bot",
      text: "Hi, I am your virtual booking host! Would you like me to make a reservation for you today?",
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<{
    intent?: string;
    extractedFacts?: BookingFacts;
    confidence?: number;
  }>({});

  // Tab state for right-hand diagnostic panels
  const [activeTab, setActiveTab] = useState<"events" | "actions" | "telemetry">("events");

  // Replay simulation state
  const [replayResult, setReplayResult] = useState<ReplayResponse | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [selectedReplaySession, setSelectedReplaySession] = useState<string>("");

  // Auto-scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Edit facts state
  const [isEditingFacts, setIsEditingFacts] = useState(false);
  const [editedFacts, setEditedFacts] = useState<{
    name?: string;
    phone?: string;
    date?: string;
    time?: string;
    party_size?: string;
  }>({});

  const startEditingFacts = () => {
    setEditedFacts({
      name: activeSession.facts?.name || "",
      phone: activeSession.facts?.phone || "",
      date: activeSession.facts?.date || "",
      time: activeSession.facts?.time || "",
      party_size: activeSession.facts?.party_size?.toString() || ""
    });
    setIsEditingFacts(true);
  };

  const handleSaveFactsOverride = async () => {
    try {
      const res = await fetch("/api/session/facts/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSessionId,
          facts: editedFacts
        })
      });
      if (res.ok) {
        setIsEditingFacts(false);
        // Refresh database stats
        await fetchDbStats();
        
        // Add system message to dialogue trace
        setMessages(prev => [...prev, {
          id: generateId(),
          sender: "system",
          text: `Manual Override Success: Facts reconciled and state updated dynamically in the background.`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        const err = await res.json();
        console.error("Failed to override facts:", err.error);
        alert(`Override failed: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch metrics and state from server
  const fetchDbStats = async () => {
    try {
      const res = await fetch("/api/db/stats");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setEvents(data.events || []);
        setTelemetry(data.telemetry || []);
        setActionQueue(data.actionQueue || []);
        
        // Auto select first session for replay dropdown if not set
        if (data.sessions && data.sessions.length > 0 && !selectedReplaySession) {
          setSelectedReplaySession(data.sessions[0].session_id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch database stats:", e);
    }
  };

  // Poll for background events/actions
  useEffect(() => {
    fetchDbStats();
    const interval = setInterval(fetchDbStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync active session changes
  const activeSession = sessions.find(s => s.session_id === activeSessionId) || {
    session_id: activeSessionId,
    current_state: "idle" as WorkflowState,
    facts: {} as BookingFacts,
    created_at: "",
    updated_at: ""
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset/Create Session
  const handleResetSession = async (targetId?: string) => {
    const id = targetId || activeSessionId;
    try {
      const res = await fetch("/api/session/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: id })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchDbStats();
        setMessages([
          {
            id: generateId(),
            sender: "system",
            text: `Session state and facts database reverted to clean idle state. [Idempotency Key Registered]`,
            timestamp: new Date().toLocaleTimeString(),
          },
          {
            id: generateId(),
            sender: "bot",
            text: "Hi, I am your virtual booking host! Would you like me to make a reservation for you today?",
            timestamp: new Date().toLocaleTimeString(),
          }
        ]);
        setLastResponse({});
        setReplayResult(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create a new fresh session
  const handleCreateNewSession = () => {
    const newId = `session-${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveSessionId(newId);
    setSelectedReplaySession(newId);
    handleResetSession(newId);
  };

  // Trigger Session Audit Replay
  const handleTriggerReplay = async (sessId: string) => {
    if (!sessId) return;
    setIsReplaying(true);
    setReplayResult(null);
    try {
      const res = await fetch("/api/session/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessId })
      });
      if (res.ok) {
        const data = await res.json();
        setReplayResult(data);
      }
    } catch (e) {
      console.error("Replay execution failed:", e);
    } finally {
      setIsReplaying(false);
    }
  };

  // Generate simple unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Send Conversational Input
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;
    
    const userMsgId = generateId();
    const tempUserMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setInputValue("");
    setIsSending(true);

    try {
      const reqId = generateId(); // Unique request_id UUID for Idempotency Requirement
      const res = await fetch("/api/session/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSessionId,
          text: textToSend,
          request_id: reqId
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Append bot reply
        const botMsg: ChatMessage = {
          id: generateId(),
          sender: "bot",
          text: data.reply || "No reply processed.",
          timestamp: new Date().toLocaleTimeString(),
        };
        
        setMessages(prev => [...prev, botMsg]);
        setLastResponse({
          intent: data.intent,
          extractedFacts: data.extractedFacts,
          confidence: data.confidence
        });

        // Trigger live state reload
        await fetchDbStats();
      } else {
        const errorMsg: ChatMessage = {
          id: generateId(),
          sender: "system",
          text: "Error calling Intent Runtime parser service.",
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // Simulation persona test actions
  const personas = [
    { label: "Book for 4 people", text: "I'd like to book a table for 4 people tomorrow evening." },
    { label: "Set time to 8:00 PM", text: "8:00 PM please." },
    { label: "Christopher / 415-555-1212", text: "My name is Christopher and my phone is 415-555-1212." },
    { label: "Confirm reservation", text: "Yes, confirm it!" },
    { label: "Cancel workflow", text: "No, cancel this." },
  ];

  // Map coordinates for state machine visualization nodes (circles & lines)
  // Perfectly balanced layout matching "Geometric Balance"
  const nodes = [
    { id: "idle", label: "Idle State", x: 60, y: 65, desc: "Awaiting Request" },
    { id: "awaiting_date", label: "Date Field", x: 190, y: 25, desc: "Awaiting Date" },
    { id: "awaiting_time", label: "Time Field", x: 330, y: 25, desc: "Awaiting Time" },
    { id: "awaiting_contact_information", label: "Contact Info", x: 190, y: 105, desc: "Awaiting Name/Phone" },
    { id: "awaiting_confirmation", label: "Verify Booking", x: 470, y: 65, desc: "Awaiting Confirm" },
    { id: "completed", label: "Committed State", x: 575, y: 65, desc: "Reservation Saved" },
  ];

  const connections = [
    { from: "idle", to: "awaiting_date" },
    { from: "idle", to: "awaiting_contact_information" },
    { from: "awaiting_date", to: "awaiting_time" },
    { from: "awaiting_time", to: "awaiting_confirmation" },
    { from: "awaiting_contact_information", to: "awaiting_confirmation" },
    { from: "awaiting_confirmation", to: "completed" },
  ];

  // Average telemetry statistics
  const avgLatency = telemetry.length 
    ? Math.round(telemetry.reduce((acc, t) => acc + t.latency_ms, 0) / telemetry.length)
    : 135;

  const totalInTokens = telemetry.reduce((acc, t) => acc + t.input_tokens, 0);
  const totalOutTokens = telemetry.reduce((acc, t) => acc + t.output_tokens, 0);

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans flex flex-col overflow-x-hidden select-none rounded-none">
      
      {/* HEADER: Sharp borders, high-contrast, strict 16px header */}
      <header className="h-16 border-b border-[#222] flex items-center justify-between px-8 bg-[#0F0F0F] shrink-0 rounded-none">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#FF5F1F] rounded-none flex items-center justify-center font-bold text-black text-xs tracking-widest shadow-none">
            IR
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-widest uppercase flex items-center gap-2">
              IntentRuntime <span className="text-[#FF5F1F] font-mono">v1.0.4-MVP</span>
            </h1>
            <p className="text-[10px] text-[#666] font-mono uppercase tracking-tighter">
              Core Kernel : AI_RECEPTIONIST_INSTANCE_01
            </p>
          </div>
        </div>
        
        <div className="flex gap-8 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#666] uppercase tracking-wider">System Status</span>
            <span className="text-[11px] font-mono text-green-500 flex items-center gap-1.5">
              ● OPERATIONAL
            </span>
          </div>
          <div className="flex flex-col items-end border-l border-[#222] pl-8">
            <span className="text-[10px] text-[#666] uppercase tracking-wider">Runtime Latency</span>
            <span className="text-[11px] font-mono text-white">
              {avgLatency}ms
            </span>
          </div>
        </div>
      </header>

      {/* ASYMMETRIC GRID SYSTEM: Monochromatic 12-column layout with 1px dark grid separators */}
      <main className="flex-1 grid grid-cols-12 gap-px bg-[#222] min-h-0 overflow-y-auto rounded-none">
        
        {/* LEFT COLUMN: ACTIVE SESSIONS & REPLAY SIMULATOR WORKSPACE */}
        <section className="col-span-12 lg:col-span-3 bg-[#0A0A0A] flex flex-col min-h-[300px] lg:min-h-0 rounded-none">
          
          <div className="p-4 border-b border-[#222] flex justify-between items-center bg-[#111] rounded-none">
            <div className="flex items-center gap-2">
              <Database size={13} className="text-[#FF5F1F]" />
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#999]">Active Sessions</h2>
            </div>
            <span className="text-[10px] font-mono text-[#FF5F1F]">
              {sessions.length.toString().padStart(2, '0')} LIVE
            </span>
          </div>

          {/* Quick Controls */}
          <div className="p-3 border-b border-[#222] bg-[#0A0A0A] flex gap-2 rounded-none">
            <button 
              onClick={handleCreateNewSession}
              className="flex-1 py-2 px-3 bg-[#111] hover:bg-[#FF5F1F] text-white hover:text-black border border-[#222] hover:border-transparent rounded-none text-xs font-mono uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5"
            >
              <Sparkles size={11} />
              New Session
            </button>
            <button 
              onClick={() => handleResetSession()}
              className="py-2 px-3 bg-[#111] hover:bg-[#1C1C1C] text-[#666] hover:text-[#CCC] border border-[#222] rounded-none text-xs font-mono uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1"
              title="Reset state"
            >
              <RotateCcw size={11} />
            </button>
          </div>

          {/* SESSIONS LIST */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#0A0A0A] max-h-[220px] lg:max-h-none border-b border-[#222] lg:border-b-0">
            {sessions.map((sess) => {
              const isActive = sess.session_id === activeSessionId;
              const hasFacts = Object.keys(sess.facts || {}).length;
              return (
                <div 
                  key={sess.session_id}
                  onClick={() => {
                    setActiveSessionId(sess.session_id);
                    setSelectedReplaySession(sess.session_id);
                    setReplayResult(null);
                  }}
                  className={`p-3 rounded-none cursor-pointer transition-all duration-150 flex flex-col gap-1 border-l-2 ${
                    isActive 
                      ? "bg-[#1A1A1A] border-[#FF5F1F]" 
                      : "bg-[#111] border-transparent opacity-60 hover:opacity-90"
                  }`}
                >
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-[10px] text-[#666] truncate max-w-[120px]">
                      ID: {sess.session_id.substring(0, 15)}
                    </span>
                    <span className={`text-[9px] uppercase font-bold ${isActive ? 'text-[#FF5F1F]' : 'text-[#666]'}`}>
                      {sess.current_state}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#999] flex items-center gap-1">
                      <User size={11} className="text-[#555]" />
                      {sess.facts?.name || "Guest Node"}
                    </span>
                    <span className="text-[9px] text-[#444]">
                      {hasFacts} facts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* WORKFLOW REPLAY AUDIT SUITE CONTAINER */}
          <div className="p-4 border-t border-[#222] bg-[#0E0E0E] flex flex-col gap-3 rounded-none">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#999] flex items-center gap-1.5">
              <Play size={12} className="text-[#FF5F1F]" />
              Kernel Replay Audit Suite
            </h3>
            <p className="text-[11px] leading-relaxed text-[#555] font-mono">
              Select any session instance to replay its immutable events window, reconstructing and verifying state transitions.
            </p>

            <div className="space-y-2 font-mono">
              <div>
                <label className="text-[9px] text-[#444] uppercase block mb-1">Target Replay Stream</label>
                <select 
                  value={selectedReplaySession}
                  onChange={(e) => {
                    setSelectedReplaySession(e.target.value);
                    setReplayResult(null);
                  }}
                  className="w-full text-xs font-mono bg-[#0A0A0A] border border-[#222] text-[#AAA] px-2.5 py-1.5 rounded-none outline-none focus:border-[#FF5F1F]"
                >
                  {sessions.map(s => (
                    <option key={s.session_id} value={s.session_id}>
                      {s.facts?.name || "Anonymous"} ({s.session_id.substring(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => handleTriggerReplay(selectedReplaySession)}
                disabled={isReplaying || !selectedReplaySession}
                className="w-full py-2 bg-[#FF5F1F] hover:bg-[#e04f14] disabled:bg-[#222] text-black font-bold text-xs uppercase tracking-wider transition-colors duration-150 rounded-none flex items-center justify-center gap-2"
              >
                {isReplaying ? "Replaying..." : "Execute State Replay Audit"}
              </button>
            </div>
          </div>
        </section>

        {/* MIDDLE COLUMN: INTERACTIVE STATE TRANSITION MAP & DIALOGUE TERMINAL */}
        <section className="col-span-12 lg:col-span-6 bg-[#0A0A0A] flex flex-col border-x border-[#222] min-h-[500px] lg:min-h-0 rounded-none">
          
          {/* INTERACTIVE GEOMETRIC STATE TRANSITION MAP */}
          <div className="p-4 border-b border-[#222] bg-[#111] flex flex-col gap-2 shrink-0 rounded-none">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#999] flex items-center gap-1.5">
                  <Activity size={12} className="text-[#FF5F1F]" />
                  Current Execution Path & State Machine
                </h2>
                <p className="text-[10px] text-[#555] font-mono uppercase tracking-tighter">
                  Deterministic Transition validation matrix
                </p>
              </div>
              <div className="px-2 py-0.5 bg-[#222] border border-[#333] text-[9px] font-mono rounded-none">
                IDEMPOTENCY_KEY: ACTIVE
              </div>
            </div>

            {/* SVG transition map - Circles for nodes, lines for transitions */}
            <div className="w-full bg-[#0A0A0A] border border-[#222] p-2 mt-1 rounded-none relative">
              <svg viewBox="0 0 640 135" className="w-full h-auto">
                {/* Connection lines */}
                {connections.map((conn, idx) => {
                  const fromNode = nodes.find(n => n.id === conn.from);
                  const toNode = nodes.find(n => n.id === conn.to);
                  if (!fromNode || !toNode) return null;
                  
                  const isTransitionActive = 
                    (activeSession.current_state === toNode.id) || 
                    (activeSession.current_state === fromNode.id && toNode.id !== "completed");

                  return (
                    <line
                      key={idx}
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isTransitionActive ? "#FF5F1F" : "#222"}
                      strokeWidth={isTransitionActive ? 1.5 : 1}
                      strokeDasharray={isTransitionActive ? "none" : "3,3"}
                    />
                  );
                })}

                {/* State Node Circles */}
                {nodes.map((node) => {
                  const isActive = activeSession.current_state === node.id;
                  return (
                    <g key={node.id} className="cursor-pointer">
                      {/* Circle border */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isActive ? 16 : 11}
                        fill="#0A0A0A"
                        stroke={isActive ? "#FF5F1F" : "#333"}
                        strokeWidth={isActive ? 2 : 1}
                      />
                      {/* Inner accent for active node */}
                      {isActive && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={6}
                          fill="#FF5F1F"
                        />
                      )}
                      
                      {/* Node Text labels */}
                      <text
                        x={node.x}
                        y={node.y + (isActive ? 30 : 22)}
                        textAnchor="middle"
                        fill={isActive ? "#FF5F1F" : "#555"}
                        className="text-[9px] font-mono font-bold uppercase tracking-wider"
                      >
                        {node.id === "awaiting_contact_information" ? "contact" : node.id === "awaiting_confirmation" ? "confirm" : node.id}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* ASYMMETRIC INNER DIVISION: CHAT TERMINAL / WORKSPACE */}
          <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
            
            {/* AUDIT / REPLAY RESULTS WORKSPACE (Displayed if loaded) */}
            {replayResult && (
              <div className="border border-[#FF5F1F]/40 bg-[#111] p-4 rounded-none flex flex-col gap-3 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-[#222] pb-2">
                  <span className="text-[#FF5F1F] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={12} />
                    Audit Replay verification Report
                  </span>
                  <button 
                    onClick={() => setReplayResult(null)}
                    className="text-[10px] text-[#666] hover:text-[#FFF] uppercase"
                  >
                    Close Audit
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] bg-[#0A0A0A] p-3 border border-[#222]">
                  <div>
                    <span className="text-[#444] uppercase block">Tested Session</span>
                    <span className="text-[#AAA] truncate block">{replayResult.session_id}</span>
                  </div>
                  <div>
                    <span className="text-[#444] uppercase block">Discrepancies</span>
                    <span className={`font-bold ${replayResult.has_discrepancies ? 'text-[#FF5F1F]' : 'text-green-500'}`}>
                      {replayResult.has_discrepancies ? "ANOMALY DETECTED" : "ZERO DISCREPANCIES"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#444] uppercase block">Final Replay State</span>
                    <span className="text-green-400 font-bold uppercase">{replayResult.final_reconstructed_state}</span>
                  </div>
                </div>

                <div className="space-y-2 mt-1">
                  <span className="text-[9px] text-[#555] uppercase tracking-wider block">Sequence Verification Path:</span>
                  <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                    {replayResult.replayed_steps.map((step, idx) => (
                      <div key={idx} className="p-2.5 bg-[#0A0A0A] border border-[#222] flex flex-col gap-1.5">
                        <div className="flex justify-between text-[9px] text-[#666]">
                          <span>Step {idx + 1}: {step.intent}</span>
                          <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-white italic">"{step.input_text}"</p>
                        <div className="grid grid-cols-2 gap-2 text-[9px] border-t border-[#111] pt-1.5 mt-1">
                          <div>
                            <span className="text-[#444] block">Simulated Reconstructed State</span>
                            <span className="text-[#FF5F1F]">{step.simulated_state}</span>
                          </div>
                          <div>
                            <span className="text-[#444] block">Recorded Historical State</span>
                            <span className="text-[#AAA]">{step.historical_state}</span>
                          </div>
                        </div>
                        {step.discrepancy && (
                          <div className="text-[9px] text-yellow-500 flex items-center gap-1 mt-1 bg-yellow-950/20 p-1 border border-yellow-950/40">
                            <AlertTriangle size={10} /> Discrepancy discovered during state transition emulation
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TWO-COLUMN GRID OF RECONCILED FACTS & STATE SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* RECONCILED FACTS TABLE */}
              <div className="border border-[#222] p-4 bg-[#0D0D0D] rounded-none flex flex-col justify-between min-h-[220px]">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-[#666] mb-3 font-bold flex justify-between items-center">
                    <span>Fact Reconciliation Engine</span>
                    <div className="flex gap-2">
                      {!isEditingFacts ? (
                        <button
                          onClick={startEditingFacts}
                          className="px-2 py-0.5 bg-[#161616] hover:bg-[#FF5F1F] text-[#888] hover:text-black border border-[#222] hover:border-transparent rounded-none text-[9px] font-mono uppercase tracking-wider transition-all duration-150 flex items-center gap-1 cursor-pointer"
                          title="Override Extracted Facts"
                        >
                          <Edit3 size={10} />
                          Override
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={handleSaveFactsOverride}
                            className="px-2 py-0.5 bg-green-950/40 text-green-400 hover:bg-green-500 hover:text-black border border-green-900 hover:border-transparent rounded-none text-[9px] font-mono uppercase tracking-wider transition-all duration-150 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Check size={10} />
                            Save
                          </button>
                          <button
                            onClick={() => setIsEditingFacts(false)}
                            className="px-2 py-0.5 bg-red-950/40 text-red-400 hover:bg-red-500 hover:text-black border border-red-900 hover:border-transparent rounded-none text-[9px] font-mono uppercase tracking-wider transition-all duration-150 flex items-center gap-0.5 cursor-pointer"
                          >
                            <X size={10} />
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </h3>

                  {!isEditingFacts ? (
                    <div className="font-mono text-xs space-y-2 mt-1">
                      <div className="flex justify-between border-b border-[#1A1A1A] pb-1.5">
                        <span className="text-[#444]">name</span>
                        <span className={activeSession.facts?.name ? "text-[#E0E0E0] font-medium" : "text-[#222] italic"}>
                          {activeSession.facts?.name || "UNSET"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#1A1A1A] pb-1.5">
                        <span className="text-[#444]">phone</span>
                        <span className={activeSession.facts?.phone ? "text-[#E0E0E0] font-medium" : "text-[#222] italic"}>
                          {activeSession.facts?.phone || "UNSET"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#1A1A1A] pb-1.5">
                        <span className="text-[#444]">date</span>
                        <span className={activeSession.facts?.date ? "text-[#FF5F1F] font-medium" : "text-[#222] italic"}>
                          {activeSession.facts?.date || "UNSET"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#1A1A1A] pb-1.5">
                        <span className="text-[#444]">time</span>
                        <span className={activeSession.facts?.time ? "text-[#FF5F1F] font-medium" : "text-[#222] italic"}>
                          {activeSession.facts?.time || "UNSET"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#1A1A1A] pb-1.5">
                        <span className="text-[#444]">party_size</span>
                        <span className={activeSession.facts?.party_size ? "text-[#E0E0E0] font-medium" : "text-[#222] italic"}>
                          {activeSession.facts?.party_size || "UNSET"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-[11px] space-y-2 mt-1 bg-[#0A0A0A] p-2 border border-[#222]">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-[#444] uppercase font-bold">name</label>
                        <input
                          type="text"
                          value={editedFacts.name || ""}
                          onChange={(e) => setEditedFacts(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-[#111] border border-[#222] text-xs font-mono text-white px-2 py-1 rounded-none outline-none focus:border-[#FF5F1F]"
                          placeholder="e.g. John Doe"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-[#444] uppercase font-bold">phone</label>
                        <input
                          type="text"
                          value={editedFacts.phone || ""}
                          onChange={(e) => setEditedFacts(prev => ({ ...prev, phone: e.target.value }))}
                          className="bg-[#111] border border-[#222] text-xs font-mono text-white px-2 py-1 rounded-none outline-none focus:border-[#FF5F1F]"
                          placeholder="e.g. 415-555-1212"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-[#444] uppercase font-bold">date</label>
                          <input
                            type="text"
                            value={editedFacts.date || ""}
                            onChange={(e) => setEditedFacts(prev => ({ ...prev, date: e.target.value }))}
                            className="bg-[#111] border border-[#222] text-xs font-mono text-white px-2 py-1 rounded-none outline-none focus:border-[#FF5F1F]"
                            placeholder="YYYY-MM-DD"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-[#444] uppercase font-bold">time</label>
                          <input
                            type="text"
                            value={editedFacts.time || ""}
                            onChange={(e) => setEditedFacts(prev => ({ ...prev, time: e.target.value }))}
                            className="bg-[#111] border border-[#222] text-xs font-mono text-white px-2 py-1 rounded-none outline-none focus:border-[#FF5F1F]"
                            placeholder="HH:MM"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-[#444] uppercase font-bold">party size</label>
                        <input
                          type="number"
                          value={editedFacts.party_size || ""}
                          onChange={(e) => setEditedFacts(prev => ({ ...prev, party_size: e.target.value }))}
                          className="bg-[#111] border border-[#222] text-xs font-mono text-white px-2 py-1 rounded-none outline-none focus:border-[#FF5F1F]"
                          placeholder="e.g. 4"
                          min="1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DETERMINISTIC STATE MACHINE CARD */}
              <div className="border border-[#222] p-4 bg-[#0D0D0D] rounded-none flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-[#666] mb-3 font-bold flex justify-between">
                    <span>State Matrix Engine</span>
                    <span className="text-green-500 font-mono">active_state</span>
                  </h3>
                  <div className="flex flex-col items-center justify-center p-4 bg-[#111] border border-[#222] rounded-none gap-2 text-center">
                    <span className="text-[10px] font-mono text-[#444] uppercase">
                      Current Node Location:
                    </span>
                    <span className="text-xs font-mono px-3 py-1 bg-[#1A1A1A] text-[#FF5F1F] border border-[#FF5F1F]/20 font-bold rounded-none">
                      {activeSession.current_state}
                    </span>
                    <p className="text-[9px] text-[#555] uppercase mt-1">
                      {activeSession.current_state === 'completed' ? 'Reservation Synced' : 'Awaiting Reconciliations'}
                    </p>
                  </div>
                </div>

                <div className="mt-2 text-[10px] font-mono text-[#444] flex flex-col gap-1 border-t border-[#1C1C1C] pt-2">
                  <div className="flex justify-between">
                    <span>Last Intent Parsed:</span>
                    <span className="text-[#E0E0E0] font-bold">{lastResponse.intent || "NONE"}</span>
                  </div>
                  {lastResponse.confidence !== undefined && (
                    <div className="flex justify-between text-[9px]">
                      <span>Intent Confidence Score:</span>
                      <span className={`font-bold ${
                        lastResponse.confidence >= 0.9 ? "text-green-500" :
                        lastResponse.confidence >= 0.75 ? "text-[#FF5F1F]" : "text-yellow-500"
                      }`}>
                        {(lastResponse.confidence).toFixed(2)} ({Math.round(lastResponse.confidence * 100)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DIALOGUE CHAT TERMINAL: 100% square corners, dark design */}
            <div className="flex-1 border border-[#222] bg-[#0A0A0A] flex flex-col rounded-none overflow-hidden min-h-[280px]">
              
              <div className="px-4 py-2 border-b border-[#222] bg-[#0E0E0E] flex justify-between items-center shrink-0 rounded-none">
                <span className="text-[10px] uppercase tracking-widest text-[#666] font-bold flex items-center gap-1.5">
                  <Terminal size={11} className="text-[#FF5F1F]" />
                  Receptionist Dialogue Terminal
                </span>
                <span className="text-[9px] font-mono text-[#555] bg-[#0A0A0A] px-2 py-0.5 border border-[#222] rounded-none">
                  SECURE_PROMPT_V1.0.4
                </span>
              </div>

              {/* Chat Message Scroll List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {messages.map((msg) => {
                  if (msg.sender === "system") {
                    return (
                      <div key={msg.id} className="text-[#666] bg-[#111] p-3 border-l-2 border-[#FF5F1F] rounded-none text-[10px] flex gap-2 items-start">
                        <AlertTriangle size={13} className="text-[#FF5F1F] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[#AAA]">{msg.text}</p>
                          <span className="text-[8px] text-[#444] block mt-1">{msg.timestamp}</span>
                        </div>
                      </div>
                    );
                  }

                  const isBot = msg.sender === "bot";
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 max-w-[85%] ${
                        isBot ? "mr-auto" : "ml-auto flex-row-reverse"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-none flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        isBot ? "bg-[#FF5F1F] text-black" : "bg-[#222] text-[#AAA]"
                      }`}>
                        {isBot ? "R" : "U"}
                      </div>
                      
                      <div className={`p-3 rounded-none border ${
                        isBot 
                          ? "bg-[#0E0E0E] border-[#222] text-[#E0E0E0]" 
                          : "bg-[#161616] border-[#FF5F1F]/20 text-white"
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[8px] text-[#444] block mt-1.5 text-right font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isSending && (
                  <div className="flex gap-3 max-w-[85%] mr-auto">
                    <div className="w-6 h-6 rounded-none bg-[#FF5F1F] text-black flex items-center justify-center font-bold text-[10px] shrink-0 animate-pulse">
                      R
                    </div>
                    <div className="p-3 bg-[#0E0E0E] border border-[#222] rounded-none text-[#555] italic flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#FF5F1F] rounded-full animate-ping"></span>
                      Evaluating Intent & Reconciling Facts...
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Presets Row */}
              <div className="px-4 py-2 border-t border-[#1C1C1C] bg-[#070707] flex flex-wrap gap-1 items-center shrink-0 rounded-none">
                <span className="text-[8px] uppercase text-[#444] font-bold font-mono mr-2">
                  PRESETS:
                </span>
                {personas.map((pers) => (
                  <button
                    key={pers.label}
                    onClick={() => handleSendMessage(pers.text)}
                    disabled={isSending}
                    className="text-[9px] font-mono px-2 py-0.5 bg-[#111] hover:bg-[#FF5F1F] hover:text-black text-[#666] border border-[#222] hover:border-transparent rounded-none transition-all duration-150 disabled:opacity-40"
                  >
                    {pers.label}
                  </button>
                ))}
              </div>

              {/* Conversational Input Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }}
                className="p-3 border-t border-[#222] bg-[#0E0E0E] flex gap-2 shrink-0 rounded-none"
              >
                <input 
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Request table booking, state date, party size, name..."
                  disabled={isSending}
                  className="flex-1 bg-[#050505] border border-[#222] focus:border-[#FF5F1F] text-xs font-mono text-[#E0E0E0] px-3.5 py-2 rounded-none outline-none focus:ring-0 placeholder:text-[#333]"
                />
                <button 
                  type="submit"
                  disabled={isSending || !inputValue.trim()}
                  className="px-4 bg-[#FF5F1F] hover:bg-[#e04f14] text-black font-bold rounded-none text-xs uppercase tracking-wider transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send size={12} />
                  <span>Execute</span>
                </button>
              </form>
            </div>

          </div>
        </section>

        {/* RIGHT COLUMN: EVENT LEDGER & TELEMETRY OBSERVABILITY METRICS */}
        <section className="col-span-12 lg:col-span-3 bg-[#0A0A0A] flex flex-col min-h-[400px] lg:min-h-0 rounded-none">
          
          {/* TAB SYSTEM */}
          <div className="border-b border-[#222] bg-[#111] flex shrink-0 rounded-none">
            <button 
              onClick={() => setActiveTab("events")}
              className={`flex-1 py-3 px-4 text-[10px] font-bold uppercase tracking-widest border-r border-[#222] transition-all duration-150 flex items-center justify-center gap-1.5 ${
                activeTab === "events" 
                  ? "bg-[#0A0A0A] text-[#FF5F1F] border-b border-b-[#FF5F1F]" 
                  : "bg-[#111] text-[#555] hover:text-[#999]"
              }`}
            >
              <FileText size={11} />
              Event Store
            </button>
            <button 
              onClick={() => setActiveTab("actions")}
              className={`flex-1 py-3 px-4 text-[10px] font-bold uppercase tracking-widest border-r border-[#222] transition-all duration-150 flex items-center justify-center gap-1.5 ${
                activeTab === "actions" 
                  ? "bg-[#0A0A0A] text-[#FF5F1F] border-b border-b-[#FF5F1F]" 
                  : "bg-[#111] text-[#555] hover:text-[#999]"
              }`}
            >
              <Zap size={11} />
              Action Queue
            </button>
            <button 
              onClick={() => setActiveTab("telemetry")}
              className={`flex-1 py-3 px-4 text-[10px] font-bold uppercase tracking-widest transition-all duration-150 flex items-center justify-center gap-1.5 ${
                activeTab === "telemetry" 
                  ? "bg-[#0A0A0A] text-[#FF5F1F] border-b border-b-[#FF5F1F]" 
                  : "bg-[#111] text-[#555] hover:text-[#999]"
              }`}
            >
              <Clock size={11} />
              Telemetry
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#0A0A0A]">
            
            {activeTab === "events" && (
              <div className="flex-1 flex flex-col border border-[#222] bg-[#0D0D0D] rounded-none overflow-hidden">
                <div className="px-3 py-2 border-b border-[#222] bg-[#111] flex justify-between items-center text-[9px] font-mono text-[#555]">
                  <span>TABLE: runtime_events</span>
                  <span className="text-[#FF5F1F]">IMMUTABLE LEDGER</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[380px] lg:max-h-none">
                  <table className="w-full text-[10px] font-mono text-left border-collapse">
                    <thead className="text-[#444] border-b border-[#222] bg-[#0A0A0A]">
                      <tr>
                        <th className="p-2 font-normal uppercase">EVENT_TYPE</th>
                        <th className="p-2 font-normal text-right uppercase">TIME</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#888]">
                      {events
                        .filter(e => e.session_id === activeSessionId)
                        .map((evt, idx) => (
                          <tr key={evt.event_id || idx} className="border-b border-[#111] hover:bg-[#121212]">
                            <td className="p-2 flex flex-col">
                              <span className="text-[#AAA] font-bold text-[9px]">{evt.event_type}</span>
                              {evt.event_type === "STATE_TRANSITION" && evt.payload && (
                                <span className="text-[8px] text-[#555]">
                                  {evt.payload.from} → {evt.payload.to}
                                </span>
                              )}
                              {evt.event_type === "FACTS_EXTRACTED" && evt.payload?.newly_extracted && (
                                <span className="text-[8px] text-[#FF5F1F]/60 truncate max-w-[140px]">
                                  + {JSON.stringify(evt.payload.newly_extracted)}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right text-[8px] text-[#444] font-mono align-top">
                              {new Date(evt.created_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))
                      }
                      {events.filter(e => e.session_id === activeSessionId).length === 0 && (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-[#444] italic">
                            No event store logs for this session yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "actions" && (
              <div className="flex-1 flex flex-col border border-[#222] bg-[#0D0D0D] rounded-none overflow-hidden">
                <div className="px-3 py-2 border-b border-[#222] bg-[#111] flex justify-between items-center text-[9px] font-mono text-[#555]">
                  <span>TABLE: action_queue</span>
                  <span className="text-[#FF5F1F]">ASYNC DISPATCHER</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 p-2 max-h-[380px] lg:max-h-none">
                  {actionQueue
                    .filter(a => a.session_id === activeSessionId)
                    .map((act) => (
                      <div key={act.action_id} className="p-2.5 bg-[#141414] border border-[#222] rounded-none flex flex-col gap-1 font-mono">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-[#FF5F1F] font-bold">{act.action_type}</span>
                          <span className={`px-1 text-[8px] uppercase font-bold ${
                            act.status === "completed" ? "bg-green-950/40 text-green-400" :
                            act.status === "running" ? "bg-blue-950/40 text-blue-400" :
                            act.status === "failed" ? "bg-red-950/40 text-red-400" : "bg-yellow-950/40 text-yellow-400"
                          }`}>
                            {act.status}
                          </span>
                        </div>
                        <div className="text-[8px] text-[#444]">
                          ID: {act.action_id.substring(0, 18)}...
                        </div>
                        <div className="text-[9px] text-[#999] bg-[#0A0A0A] p-1.5 border border-[#1C1C1C] rounded-none mt-1">
                          {JSON.stringify(act.payload)}
                        </div>
                      </div>
                    ))
                  }
                  {actionQueue.filter(a => a.session_id === activeSessionId).length === 0 && (
                    <div className="p-6 text-center text-[#444] italic">
                      No background actions queued. Complete a booking flow to queue actions.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "telemetry" && (
              <div className="flex-1 flex flex-col border border-[#222] bg-[#0D0D0D] rounded-none overflow-hidden font-mono text-xs p-3 space-y-3">
                <div className="text-[10px] text-[#FF5F1F] uppercase font-bold border-b border-[#222] pb-1.5 flex justify-between">
                  <span>Prompt Telemetry Log</span>
                  <span>VERSION TRACE</span>
                </div>
                
                <div className="space-y-3 overflow-y-auto max-h-[350px] lg:max-h-none">
                  {telemetry.map((t, idx) => (
                    <div key={t.id || idx} className="p-2 bg-[#111] border border-[#222] rounded-none space-y-1 text-[10px]">
                      <div className="flex justify-between text-[#888]">
                        <span>PROVIDER: {t.provider}</span>
                        <span>{new Date(t.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-white">
                        <span>MODEL: {t.model}</span>
                        <span className="text-[#FF5F1F]">{t.prompt_version}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1 text-[#666] border-t border-[#1C1C1C] text-[9px]">
                        <div>LAT: {t.latency_ms}ms</div>
                        <div>IN: {t.input_tokens}t</div>
                        <div>OUT: {t.output_tokens}t</div>
                      </div>
                    </div>
                  ))}

                  {telemetry.length === 0 && (
                    <p className="text-[#444] italic text-center py-4">No model invocations monitored.</p>
                  )}
                </div>
              </div>
            )}

            {/* OBSERVARBILITY SUMMARY PANEL */}
            <div className="border border-[#222] bg-[#0E0E0E] p-4 rounded-none flex flex-col gap-3.5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#999] border-b border-[#1E1E1E] pb-2 font-mono">
                Telemetry & Traceability
              </h3>

              <div className="space-y-3 font-mono">
                <div>
                  <label className="text-[9px] text-[#444] uppercase block mb-0.5">Active Reasoning Engine</label>
                  <div className="text-xs bg-[#050505] p-2 border border-[#222] text-[#AAA] flex items-center justify-between rounded-none">
                    <span>Google Gemini API</span>
                    <span className="text-[9px] text-[#FF5F1F]">gemini-3.5-flash</span>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-[#444] uppercase block mb-0.5">Prompt Version Signature</label>
                  <div className="text-xs bg-[#050505] p-2 border border-[#222] text-[#AAA] rounded-none">
                    receptionist_v1.0.4_mvp
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-[#444] uppercase block mb-0.5">Accumulated In</label>
                    <div className="text-xs bg-[#050505] p-2 border border-[#222] text-[#AAA] rounded-none">
                      {totalInTokens || 812} tkn
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-[#444] uppercase block mb-0.5">Accumulated Out</label>
                    <div className="text-xs bg-[#050505] p-2 border border-[#222] text-[#AAA] rounded-none">
                      {totalOutTokens || 144} tkn
                    </div>
                  </div>
                </div>
              </div>

              {/* Resource indicator */}
              <div className="mt-2 border-t border-[#1C1C1C] pt-3">
                <div className="flex justify-between items-center mb-1.5 text-[9px] text-[#444] uppercase font-mono">
                  <span>Resource Usage</span>
                  <span className="font-mono text-[#AAA]">12%</span>
                </div>
                <div className="w-full h-1 bg-[#1A1A1A] rounded-none overflow-hidden">
                  <div className="h-full w-[12%] bg-[#FF5F1F] rounded-none" />
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* FOOTER: Strict, single-row information, 10px fonts */}
      <footer className="h-10 border-t border-[#222] bg-[#0A0A0A] flex items-center justify-between px-8 text-[9px] text-[#444] font-mono shrink-0 rounded-none">
        <div className="flex gap-6 uppercase">
          <span>Active Session ID: 0x{activeSessionId.substring(0, 10)}</span>
          <span className="hidden sm:inline">Master_Spec: Master_Spec_Addendum.md</span>
        </div>
        <div className="flex gap-6 uppercase">
          <span className="hidden md:inline">Database Session: localhost:3000 (Postgres)</span>
          <span className="text-[#FF5F1F] font-bold">MVP: AI Receptionist Phase 0</span>
        </div>
      </footer>
    </div>
  );
}
