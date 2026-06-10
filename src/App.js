import { useEffect, useState, useRef, useCallback } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL;

function App() {

  const [sessionId, setSessionId] = useState(
    localStorage.getItem("chat_session_id") || process.env.REACT_APP_DEFAULT_SESSION_ID
  );
  const [usuario, setUsuario] = useState(
    process.env.REACT_APP_DEFAULT_USUARIO
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef(null);

  // 🔐 Crear / recuperar sessionId
  useEffect(() => {

    const receiveMessage = (event) => {

      // Seguridad
      const ALLOWED_ORIGIN = process.env.REACT_APP_ALLOWED_ORIGIN;
      if (event.origin !== ALLOWED_ORIGIN) {
        return;
      }

      const data = event.data;

      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem("chat_session_id", data.session_id);
      }

      if (data.usuario) {
        setUsuario(data.usuario);
      }
    };

    window.addEventListener("message", receiveMessage);

    return () => {
      window.removeEventListener("message", receiveMessage);
    };

  }, []);

  // 🔽 Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 📡 Enviar mensaje
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      console.log("Sending message:>>>", API_URL);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: input,
          session_id: sessionId,
          usuario: usuario, // Puedes cambiar esto por un identificador real si lo deseas
          ip:"128.2.135.7"
        })
      });

      const data = await res.json();

      if (!res.ok) {
        const botMessage = {
          role: "bot",
          text: data.detail || "Error en el servidor"
        };

        setMessages((prev) => [...prev, botMessage]);
        setLoading(false);
        return;
      }

      const botMessage = { role: "bot", text: data.response };
      const utterance = new SpeechSynthesisUtterance(data.response);      
      const voices = window.speechSynthesis.getVoices();

      console.log("VOCES DISPONIBLES:");

      //voices.forEach(v => {
      //  console.log(v.name, "-", v.lang);
      //});
      //const voz = voices.find(
      //  v => v.lang.startsWith("es") && v.name.includes("Mónica")
      //);

      const preferredVoices = [
        "Mónica",
        "Paulina",
        "Microsoft Helena",
        "Microsoft Laura",
        "Google español"
      ];
      const voz =
        voices.find(v =>
          preferredVoices.some(name =>
            v.name.includes(name)
          )
        ) ||
        voices.find(v => v.lang.startsWith("es"));

      if (voz) {
        utterance.voice = voz;
      }
      utterance.lang = "es-ES";
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.volume = 1;    
      window.speechSynthesis.speak(utterance);

      setMessages((prev) => [...prev, botMessage]);

      // (por si backend devuelve uno nuevo)
      if (data.session_id && data.session_id !== sessionId) {
        localStorage.setItem("chat_session_id", data.session_id);
        setSessionId(data.session_id);
      }

    } catch (err) {
      console.log("Error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Error conectando con el servidor" }
      ]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };
  
  const sendVoiceMessage =useCallback( async (voiceText) => {

    const userMessage = {
      role: "user",
      text: voiceText
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: voiceText,
          session_id: sessionId,
          usuario: usuario,
          ip:"128.2.135.7"
        })
      });

      const data = await res.json();

      const botMessage = {
        role: "bot",
        text: data.response
      };
      const utterance = new SpeechSynthesisUtterance(data.response);
      const voices = window.speechSynthesis.getVoices();
      console.log("VOCES DISPONIBLES:");

      //voices.forEach(v => {
      //  console.log(v.name, "-", v.lang);
      //});
      //const voz = voices.find(
      //  v => v.lang.startsWith("es") && v.name.includes("Mónica")
      //);

      const preferredVoices = [
        "Mónica",
        "Paulina",
        "Microsoft Helena",
        "Microsoft Laura",
        "Google español"
      ];
      const voz =
        voices.find(v =>
          preferredVoices.some(name =>
            v.name.includes(name)
          )
        ) ||
        voices.find(v => v.lang.startsWith("es"));

      if (voz) {
        utterance.voice = voz;
      }
      utterance.lang = "es-ES";
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);

      setMessages((prev) => [...prev, botMessage]);

    } catch (err) {

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Error conectando con el servidor"
        }
      ]);
    }

    setLoading(false);
  }, [sessionId, usuario]  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.log("SpeechRecognition no soportado");
        return;
      }

      const recognition = new SpeechRecognition();

      recognition.lang = "es-ES";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;

        setInput(transcript);

        // opcional enviar automático
        setTimeout(() => {
          sendVoiceMessage(transcript);
        }, 500);
      };

      recognition.onerror = (event) => {
        console.log("Speech error:", event.error);
        setListening(false);
      };

      recognitionRef.current = recognition;
  }, [sendVoiceMessage]);
      
  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  


  return (
    <div className="chat-container">

      {/* HEADER - Restructured for Option 2 layout */}
      <div className="chat-header">
        <div>
          <h2>Chatbot</h2>
          {/* Option 2 shows a subtitle, add it here */}
          <h3>Asistente Virtual RPE</h3>
        </div>
        <img
          src={
            loading
              ? "https://cdn-icons-png.flaticon.com/512/4712/4712027.png" // thinking
              : "https://cdn-icons-png.flaticon.com/512/4712/4712109.png" // normal
          }
          className="bot-avatar" // Removed the ternary class from here; handled via CSS/Layout now
          alt="Bot Avatar"
        />
      </div>

      {/* MENSAJES - No changes here, CSS does the work */}
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`bubble ${msg.role === "user" ? "user" : "bot"}`}
          >
            {msg.text}
          </div>
        ))}

        {loading && <div className="bubble bot">Asistente Virtual está escribiendo...</div>}
        <div ref={bottomRef} />
      </div>

      {/* INPUT - Restructured input area and buttons */}
      <div className="chat-input">
        
        {/* NEW MODERN WRAPPER around the actual input and microphone */}
        <div className="modern-input-wrapper">
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe un mensaje aquí..." /* Updated placeholder */
            />

            {/* BOTON MICROFONO - Now inside the white wrapper */}
            <button
                onClick={startListening}
                className={listening ? "mic-button listening" : "mic-button"}
            >
                {/* Changed glyph for a modern icon-like appearance; 
                    consider using fontawesome for real icons */}
                🎙️ 
            </button>
        </div>

        {/* BOTON ENVIAR - Stays on the right outside the wrapper as in image */}
        <button onClick={sendMessage} className="send-button">
          {/* Changed glyph for a modern arrow; or use FontAwesome icon */}
          <span style={{color: '#2c5aa0'}}>➤</span> 
        </button>

      </div>

    </div>
  );


}

export default App;