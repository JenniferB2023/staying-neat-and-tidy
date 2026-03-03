import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Trash2, Download, Camera } from "lucide-react";

/*
====================================================
STABLE SANDBOX BUILD 🌸
- No Firebase
- No external barcode libraries
- No browser APIs accessed during module load
- All browser-only features guarded safely
- Works in restricted / SSR / sandbox environments
====================================================
*/

export default function InventoryTracker() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [scanning, setScanning] = useState(false);
  const [barcodeSupported, setBarcodeSupported] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);

  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    quantity: "",
    expiration: "",
    barcode: "",
  });

  /* ==============================
     SAFE CLIENT-SIDE INITIALIZATION
  ============================== */
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load saved data safely
    try {
      const saved = window.localStorage.getItem("home_inventory");
      if (saved) setItems(JSON.parse(saved));
    } catch (e) {
      console.error("LocalStorage load failed", e);
    }

    // Detect barcode support safely
    if ("BarcodeDetector" in window) {
      setBarcodeSupported(true);
      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ["ean_13", "upc_a", "qr_code"],
        });
      } catch (e) {
        console.warn("BarcodeDetector init failed", e);
        setBarcodeSupported(false);
      }
    }
  }, []);

  // Persist data safely
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("home_inventory", JSON.stringify(items));
    } catch (e) {
      console.error("LocalStorage save failed", e);
    }
  }, [items]);

  /* ==============================
     CRUD
  ============================== */
  const addItem = () => {
    if (!newItem.name.trim()) return;

    const newEntry = {
      ...newItem,
      id: Date.now().toString(),
    };

    setItems((prev) => [...prev, newEntry]);

    setNewItem({
      name: "",
      category: "",
      quantity: "",
      expiration: "",
      barcode: "",
    });
  };

  const deleteItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  /* ==============================
     BARCODE SCANNING (SAFE)
  ============================== */
  const startScanner = async () => {
    if (!barcodeSupported) {
      alert("Barcode scanning is not supported in this browser.");
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      alert("Camera access is not available in this environment.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      setScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      scanFrame();
    } catch (err) {
      console.error("Camera start failed", err);
      alert("Unable to access camera.");
    }
  };

  const scanFrame = async () => {
    if (!detectorRef.current || !videoRef.current || !scanning) return;

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);

      if (barcodes.length > 0) {
        setNewItem((prev) => ({
          ...prev,
          barcode: barcodes[0].rawValue,
        }));
        stopScanner();
        return;
      }
    } catch (err) {
      console.warn("Barcode detection error", err);
    }

    requestAnimationFrame(scanFrame);
  };

  const stopScanner = () => {
    setScanning(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /* ==============================
     FILTERING & SORTING
  ============================== */
  const categories = useMemo(() => {
    const unique = [...new Set(items.map((i) => i.category).filter(Boolean))];
    return ["All", ...unique];
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = items.filter((item) => {
      const matchesSearch = item.name
        ?.toLowerCase()
        .includes(search.toLowerCase());
      const matchesFilter = filter === "All" || item.category === filter;
      return matchesSearch && matchesFilter;
    });

    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "quantity") return Number(a.quantity) - Number(b.quantity);
      if (sortBy === "expiration")
        return new Date(a.expiration || 0) - new Date(b.expiration || 0);
      return 0;
    });

    return list;
  }, [items, search, filter, sortBy]);

  /* ==============================
     EXPORT
  ============================== */
  const exportCSV = () => {
    if (typeof window === "undefined") return;

    const headers = ["Name", "Category", "Quantity", "Expiration", "Barcode"];
    const rows = items.map((item) => [
      item.name,
      item.category,
      item.quantity,
      item.expiration,
      item.barcode,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map((row) => row.map((field) => `"${field || ""}"`).join(","))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = "home_inventory.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ==============================
     UI
  ============================== */
  return (
    <div className="min-h-screen bg-pink-50 p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center text-pink-500 mb-6">
        🌸 Inventory Tracker 🌸
      </h1>

      <Card className="mb-6 rounded-2xl shadow-lg bg-white">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-6 gap-4">
          <Input
            placeholder="Item"
            value={newItem.name}
            onChange={(e) =>
              setNewItem({ ...newItem, name: e.target.value })
            }
          />
          <Input
            placeholder="Category"
            value={newItem.category}
            onChange={(e) =>
              setNewItem({ ...newItem, category: e.target.value })
            }
          />
          <Input
            type="number"
            placeholder="Qty"
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem({ ...newItem, quantity: e.target.value })
            }
          />
          <Input
            type="date"
            value={newItem.expiration}
            onChange={(e) =>
              setNewItem({ ...newItem, expiration: e.target.value })
            }
          />
          <Input
            placeholder="Barcode"
            value={newItem.barcode}
            onChange={(e) =>
              setNewItem({ ...newItem, barcode: e.target.value })
            }
          />

          <Button
            onClick={startScanner}
            disabled={!barcodeSupported}
            className="bg-rose-300 rounded-2xl"
          >
            <Camera className="w-4 h-4" /> Scan
          </Button>

          <Button
            onClick={addItem}
            className="bg-pink-400 hover:bg-pink-500 rounded-2xl"
          >
            Add
          </Button>
        </CardContent>
      </Card>

      {scanning && (
        <div className="mb-6 text-center">
          <video
            ref={videoRef}
            className="w-full max-w-md mx-auto rounded-xl"
          />
          <Button
            onClick={stopScanner}
            className="mt-4 bg-gray-300 rounded-2xl"
          >
            Stop Scanner
          </Button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border rounded-2xl px-4 py-2"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>

        <select
          className="border rounded-2xl px-4 py-2"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="quantity">Sort by Quantity</option>
          <option value="expiration">Sort by Expiration</option>
        </select>

        <Button
          onClick={exportCSV}
          className="bg-pink-300 rounded-2xl flex gap-2"
        >
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="rounded-2xl shadow-md border-2 border-pink-200">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg text-pink-600">
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-500">{item.category}</p>
                  <p className="text-sm">Qty: {item.quantity}</p>
                  {item.expiration && (
                    <p className="text-sm">Exp: {item.expiration}</p>
                  )}
                  {item.barcode && (
                    <p className="text-xs text-gray-400">
                      Barcode: {item.barcode}
                    </p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteItem(item.id)}
                  className="rounded-2xl"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
self.addEventListener("push", function (event) {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
  });
});
const EMAILJS_ENDPOINT = "YOUR_ENDPOINT_HERE";
self.addEventListener("push", function (event) {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
