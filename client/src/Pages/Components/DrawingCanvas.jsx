import { useRef, useEffect, useState } from "react";

const DrawingCanvas = ({ onDraw ,remoteDrawData, setShowCanvas , setStrokes , strokes}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

   const drawStroke = (ctx, stroke) => {
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    if (stroke.type === "start") {
      ctx.beginPath();
      ctx.moveTo(stroke.x, stroke.y);
    } else if (stroke.type === "draw") {
      ctx.lineTo(stroke.x, stroke.y);
      ctx.stroke();
    } else if (stroke.type === "end") {
      ctx.closePath();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const startDrawing = (e) => {
      setIsDrawing(true);
      const stroke = {
        x: e.offsetX,
        y: e.offsetY,
        type: "start",
      };
      setStrokes((prev) => [...prev, stroke]);
      onDraw?.(stroke);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      const stroke = {
        x: e.offsetX,
        y: e.offsetY,
        type: "draw",
      };
      setStrokes((prev) => [...prev, stroke]);
      onDraw?.(stroke);
      drawStroke(ctx, stroke);
    };

    const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      const stroke = { type: "end" };
      setStrokes((prev) => [...prev, stroke]);
      onDraw?.(stroke);
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseleave", stopDrawing);
    };
  }, [isDrawing, onDraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    let drawing = false;

    for (const stroke of strokes) {
      if (stroke.type === "start") {
        ctx.beginPath();
        ctx.moveTo(stroke.x, stroke.y);
        drawing = true;
      } else if (stroke.type === "draw" && drawing) {
        ctx.lineTo(stroke.x, stroke.y);
        ctx.stroke();
      } else if (stroke.type === "end") {
        drawing = false;
        ctx.closePath();
      }
    }
  }, [strokes]);


  useEffect(() => {
    if (!remoteDrawData) return;
     if (remoteDrawData.type === "clear") {
      setStrokes([]);
      return;
    }
    setStrokes((prev) => [...prev, remoteDrawData]); // add it to saved strokes
  }, [remoteDrawData]);

   return (
    // Fullscreen overlay
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="relative bg-white rounded-lg shadow-lg p-4">
        {/* Close button */}
        <button
          onClick={() => setShowCanvas(false)}
          className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold"
        >
          ✕
        </button>
        <button
        onClick={() => {
          setStrokes([]);
          onDraw?.({ type: "clear" });
        }}
        className="absolute -top-3 left-0 bg-yellow-500 hover:bg-yellow-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold"
        title="Clear Canvas"
      >
        🧹
      </button>


        {/* The canvas */}
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="border border-gray-300 rounded-md bg-white cursor-crosshair"
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;
