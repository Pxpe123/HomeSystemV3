
export default function Page1() {
  const handleClick = () => {
    alert("Button clicked on Page 1!");
  };
 
  return (
    <div className="flex-shrink-0 w-screen h-screen flex flex-col items-center justify-center">
      <div className="text-white text-4xl font-bold mb-6">Page 1</div>
      <button
        onClick={handleClick}
        className="px-6 py-3 bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-700 transition"
      >
        Click Me
      </button>
    </div>
  );
}
