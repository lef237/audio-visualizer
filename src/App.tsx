import AudioVisualizer from "./components/AudioVisualizer";

function App() {
  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-blue-300 text-3xl mb-4">Audio Visualizer</h1>
      <a
        href="https://github.com/lef237"
        className="text-blue-300 text-xs mb-4"
      >
        created by @lef237
      </a>
      <AudioVisualizer />
    </div>
  );
}

export default App;
