import AudioVisualizer from "./components/AudioVisualizer";

function App() {
  return (
    <div className="bg-black min-h-screen">
      <h1 className="text-blue-300 text-3xl">Audio Visualizer</h1>
      <a href="https://github.com/lef237" className="text-blue-300 text-xs">
        created by @lef237
      </a>
      <AudioVisualizer />
    </div>
  );
}

export default App;
