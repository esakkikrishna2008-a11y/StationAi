export const initialInventory = [
    {
        id: 1, name: "Classmate 200-Page Notebook", category: "Notebooks", brand: "Classmate", sku: "NB-001",
        price: 80, stock: 24, reorderLevel: 5, unit: "piece", shelf: "A", row: "A2", column: "04",
        description: "200-page ruled notebook for school and college use with premium quality paper.",
        image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 2, name: "Cello Blue Ball Pen", category: "Pens", brand: "Cello", sku: "PN-101",
        price: 10, stock: 45, reorderLevel: 20, unit: "piece", shelf: "B", row: "B1", column: "02",
        description: "Smooth writing blue ballpoint pen, 0.5mm tip.",
        image: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 3, name: "Apsara Platinum Pencil", category: "Pencils", brand: "Apsara", sku: "PC-001",
        price: 8, stock: 5, reorderLevel: 15, unit: "piece", shelf: "B", row: "B2", column: "03",
        description: "Extra dark lead pencil for precise drawing and writing.",
        image: "https://images.unsplash.com/photo-1510172951991-856a654063f9?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 4, name: "Camlin Geometry Box", category: "Geometry", brand: "Camlin", sku: "GM-050",
        price: 120, stock: 12, reorderLevel: 5, unit: "box", shelf: "C", row: "C1", column: "01",
        description: "Complete mathematical drawing instruments box.",
        image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 5, name: "Faber-Castell Textliner", category: "Highlighters", brand: "Faber-Castell", sku: "HL-800",
        price: 35, stock: 3, reorderLevel: 10, unit: "piece", shelf: "A", row: "A3", column: "05",
        description: "Super fluorescent highlighter, chisel tip.",
        image: "https://images.unsplash.com/photo-1568822699863-108b65675c94?w=500&q=80",
        expiryTracking: true, batches: [
            { batchId: "HL-2026", quantityLoaded: 20, currentQuantity: 3, loadedDate: "2026-06-01", expiryDate: "2026-10-01", supplier: "FC Official", shelf: "A", row: "A3", column: "05" }
        ]
    },
    {
        id: 6, name: "Luxor Whiteboard Marker", category: "Markers", brand: "Luxor", sku: "MK-300",
        price: 25, stock: 0, reorderLevel: 10, unit: "piece", shelf: "B", row: "B3", column: "01",
        description: "Dry erase whiteboard marker with bullet tip. Black color.",
        image: "https://images.unsplash.com/photo-1580569214296-5cb2afebd354?w=500&q=80",
        expiryTracking: true, batches: []
    },
    {
        id: 7, name: "Nataraj Eraser Box", category: "Erasers", brand: "Nataraj", sku: "ER-020",
        price: 40, stock: 30, reorderLevel: 15, unit: "box", shelf: "B", row: "B2", column: "04",
        description: "Dust-free non-toxic erasers, box of 20 pieces.",
        image: "https://images.unsplash.com/photo-1632223847285-d8ccdb2cc7ff?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 8, name: "Fevicol MR 100g", category: "Glue", brand: "Pidilite", sku: "GL-100",
        price: 30, stock: 8, reorderLevel: 10, unit: "bottle", shelf: "C", row: "C2", column: "02",
        description: "White synthetic resin adhesive for paper and craft.",
        image: "https://images.unsplash.com/photo-1621217036603-ad7b3d3098f9?w=500&q=80",
        expiryTracking: true, batches: [
            { batchId: "GL-2026-04", quantityLoaded: 20, currentQuantity: 8, loadedDate: "2026-09-10", expiryDate: "2026-12-10", supplier: "ABC Stationery Suppliers", shelf: "C", row: "C2", column: "02" }
        ]
    },
    {
        id: 9, name: "Kangaro Stapler", category: "Staplers", brand: "Kangaro", sku: "ST-010",
        price: 65, stock: 14, reorderLevel: 5, unit: "piece", shelf: "C", row: "C3", column: "01",
        description: "No. 10 size medium stapler.",
        image: "https://images.unsplash.com/photo-1629814696209-4f4faf2ab874?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 10, name: "Post-it Notes 3x3", category: "Sticky Notes", brand: "3M", sku: "SN-303",
        price: 90, stock: 45, reorderLevel: 25, unit: "pad", shelf: "A", row: "A1", column: "02",
        description: "Yellow sticky notes pad, 100 sheets.",
        image: "https://images.unsplash.com/photo-1586521995568-39abaa0c2311?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 11, name: "Century A4 Copier Paper", category: "Paper", brand: "Century", sku: "PP-A40",
        price: 250, stock: 12, reorderLevel: 20, unit: "ream", shelf: "C", row: "C3", column: "04",
        description: "500 sheets of 70 GSM A4 size paper.",
        image: "https://images.unsplash.com/photo-1581404172551-71fb34268e3a?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 12, name: "Camel Water Colors", category: "Art Supplies", brand: "Camel", sku: "AT-012",
        price: 150, stock: 6, reorderLevel: 8, unit: "set", shelf: "D", row: "D1", column: "01",
        description: "12 shade water tubes for artist.",
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&q=80",
        expiryTracking: true, batches: [
            { batchId: "AT-123A", quantityLoaded: 20, currentQuantity: 6, loadedDate: "2026-08-11", expiryDate: "2026-09-30", supplier: "Global Colors", shelf: "D", row: "D1", column: "01" }
        ]
    },
    {
        id: 13, name: "Camel Sketch Pens", category: "Art Supplies", brand: "Camel", sku: "AT-212",
        price: 50, stock: 18, reorderLevel: 10, unit: "set", shelf: "D", row: "D1", column: "02",
        description: "12 shade vibrant sketch pens for kids.",
        image: "https://images.unsplash.com/photo-1456086272160-b22340366ebc?w=500&q=80",
        expiryTracking: true, batches: [
            { batchId: "SK-B22", quantityLoaded: 30, currentQuantity: 18, loadedDate: "2026-01-01", expiryDate: "2027-01-01", supplier: "Camel Dist", shelf: "D", row: "D1", column: "02" }
        ]
    },
    {
        id: 14, name: "Maped Scissors 17cm", category: "Scissors", brand: "Maped", sku: "SC-170",
        price: 75, stock: 0, reorderLevel: 5, unit: "piece", shelf: "C", row: "C2", column: "03",
        description: "Stainless steel comfortable blade scissors.",
        image: "https://images.unsplash.com/photo-1503792501406-2c40da09e1e2?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 15, name: "Nataraj 30cm Ruler", category: "Rulers", brand: "Nataraj", sku: "RL-300",
        price: 15, stock: 35, reorderLevel: 15, unit: "piece", shelf: "B", row: "B3", column: "04",
        description: "Clear plastic 30cm measurement ruler.",
        image: "https://images.unsplash.com/photo-1614725042459-25f0a0c20188?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 16, name: "Reynolds Trimax Pen", category: "Pens", brand: "Reynolds", sku: "PN-300",
        price: 50, stock: 22, reorderLevel: 15, unit: "piece", shelf: "B", row: "B1", column: "01",
        description: "Advanced fluid ink technology for smooth writing.",
        image: "https://images.unsplash.com/photo-1595085601839-4d6b5e13dcd2?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 17, name: "Classmate Drawing Book", category: "Notebooks", brand: "Classmate", sku: "NB-DB1",
        price: 45, stock: 14, reorderLevel: 10, unit: "piece", shelf: "A", row: "A2", column: "01",
        description: "Unruled drawing book, 40 pages.",
        image: "https://images.unsplash.com/photo-1522881451255-f59ad836fdf8?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 18, name: "Solo Ring Binder", category: "Files", brand: "Solo", sku: "FL-R11",
        price: 130, stock: 9, reorderLevel: 5, unit: "piece", shelf: "C", row: "C1", column: "04",
        description: "A4 size 2D ring binder file, assorted colors.",
        image: "https://images.unsplash.com/photo-1582214959146-559d81d2df68?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 19, name: "American Tourister Bag", category: "School Bags", brand: "American Tourister", sku: "BG-A55",
        price: 1550, stock: 2, reorderLevel: 3, unit: "piece", shelf: "D", row: "D2", column: "02",
        description: "Durable 3-compartment backpack.",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80",
        expiryTracking: false, batches: []
    },
    {
        id: 20, name: "Skybags Marvel Edit", category: "School Bags", brand: "Skybags", sku: "BG-S70",
        price: 1800, stock: 4, reorderLevel: 2, unit: "piece", shelf: "D", row: "D2", column: "03",
        description: "Marvel Avengers theme backpack.",
        image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80",
        expiryTracking: false, batches: []
    }
];

export const shelves = ['A', 'B', 'C', 'D'];

export const calculateStatus = (stock, reorderLevel) => {
    if (stock > reorderLevel) return 'In Stock';
    if (stock > 0 && stock <= reorderLevel) return 'Low Stock';
    return 'Out of Stock';
};
