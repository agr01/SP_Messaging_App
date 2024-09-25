import Image from "next/image";
import localFont from "next/font/local";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function Home() {
  return (
<div className="flex flex-row bg-black h-dvh w-dvh min-w-0">
  {/* Sidebar */}
  <div className="flex flex-col bg-slate-800 w-[30rem]">
    <div className="p-5 font-semibold text-xl">Online</div>
  </div>
  
  {/* Chat Screen */}
  <div className="flex flex-col bg-slate-900 w-full h-full p-10 min-w-0">
    {/* Messages container */}
    <div className="flex flex-col h-full"></div>
    {/* Input row */}
    <div className="flex flex-row w-full gap-2 min-w-0 h-min">
      <div 
        contentEditable 
        id="message" 
        className="w-full max-w-full break-words whitespace-normal p-2.5 overflow-hidden border text-sm rounded-lg 
                   focus:border-blue-500 focus:outline-none bg-slate-700 border-slate-600 text-white"
      />      

      <button 
        type="submit" 
        className="self-end w-min h-min rounded-lg px-5 py-2.5 text-center text-white font-semibold bg-blue-600 hover:bg-blue-700"
      >
        Send
      </button>
    </div>
  </div>
</div>
  );
}
