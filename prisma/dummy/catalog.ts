// Dummy catalogue used until the client's real products arrive.
// Names read realistically; images are generated SVG placeholders (no third-party photos).

export type Cat = {
  slug: string;
  name: string;
  gender: "WOMEN" | "MEN" | "KIDS" | "UNISEX";
  parent?: string;
  chart?: string;
  showInMenu?: boolean;
};

export const categories: Cat[] = [
  { slug: "women", name: "Women", gender: "WOMEN" },
  { slug: "kurta-sets", name: "Kurta Sets", gender: "WOMEN", parent: "women", chart: "women-top" },
  { slug: "kurtis", name: "Kurtas & Kurtis", gender: "WOMEN", parent: "women", chart: "women-top" },
  { slug: "sarees", name: "Sarees", gender: "WOMEN", parent: "women" },
  { slug: "women-bottoms", name: "Bottoms & Dupattas", gender: "WOMEN", parent: "women", chart: "women-bottom" },
  { slug: "men", name: "Men", gender: "MEN" },
  { slug: "men-kurtas", name: "Kurtas & Ethnic", gender: "MEN", parent: "men", chart: "men-top" },
  { slug: "men-shirts", name: "Shirts", gender: "MEN", parent: "men", chart: "men-top" },
  { slug: "men-tshirts", name: "T-Shirts", gender: "MEN", parent: "men", chart: "men-top" },
  { slug: "men-jeans", name: "Jeans & Trousers", gender: "MEN", parent: "men", chart: "men-bottom" },
  { slug: "kids", name: "Kids", gender: "KIDS" },
  { slug: "girls", name: "Girls", gender: "KIDS", parent: "kids", chart: "kids" },
  { slug: "boys", name: "Boys", gender: "KIDS", parent: "kids", chart: "kids" },
  { slug: "innerwear", name: "Innerwear", gender: "UNISEX" },
  { slug: "women-innerwear", name: "Women Innerwear", gender: "WOMEN", parent: "innerwear", chart: "women-inner" },
  { slug: "men-innerwear", name: "Men Innerwear", gender: "MEN", parent: "innerwear", chart: "men-inner" },
];

export const sizeCharts = {
  "women-top": {
    name: "Women Kurta / Top",
    columns: ["Bust (in)", "Waist (in)", "Hip (in)"],
    rows: [
      { size: "XS", values: ["32", "26", "35"] },
      { size: "S", values: ["34", "28", "37"] },
      { size: "M", values: ["36", "30", "39"] },
      { size: "L", values: ["38", "32", "41"] },
      { size: "XL", values: ["40", "34", "43"] },
      { size: "XXL", values: ["42", "36", "45"] },
      { size: "3XL", values: ["44", "38", "47"] },
    ],
    howToMeasure: "Bust: measure around the fullest part of your chest, keeping the tape level. Waist: around the narrowest part. Hip: around the fullest part.",
    fitRule: "Pick the size by your bust. If your bust is 35\", choose M for a relaxed fit, or S for a closer fit.",
  },
  "women-bottom": {
    name: "Women Bottoms",
    columns: ["Waist (in)", "Hip (in)", "Length (in)"],
    rows: [
      { size: "S", values: ["26-28", "36", "38"] },
      { size: "M", values: ["28-30", "38", "38"] },
      { size: "L", values: ["30-32", "40", "39"] },
      { size: "XL", values: ["32-34", "42", "39"] },
      { size: "XXL", values: ["34-36", "44", "40"] },
    ],
    howToMeasure: "Waist: where you normally wear your bottoms. Hip: around the fullest part.",
    fitRule: "Elastic waist bottoms stretch about 2\"; go by your hip if between sizes.",
  },
  "men-top": {
    name: "Men Shirt / Kurta / T-Shirt",
    columns: ["Chest (in)", "Shoulder (in)", "Length (in)"],
    rows: [
      { size: "S", values: ["38", "17", "28"] },
      { size: "M", values: ["40", "17.5", "29"] },
      { size: "L", values: ["42", "18", "30"] },
      { size: "XL", values: ["44", "18.5", "31"] },
      { size: "XXL", values: ["46", "19", "32"] },
    ],
    howToMeasure: "Chest: around the fullest part under your arms.",
    fitRule: "Pick by chest size. Slim fit runs about 1\" closer.",
  },
  "men-bottom": {
    name: "Men Jeans / Trousers",
    columns: ["Waist (in)", "Hip (in)", "Inseam (in)"],
    rows: [
      { size: "30", values: ["30", "38", "31"] },
      { size: "32", values: ["32", "40", "31"] },
      { size: "34", values: ["34", "42", "32"] },
      { size: "36", values: ["36", "44", "32"] },
      { size: "38", values: ["38", "46", "32"] },
    ],
    howToMeasure: "Waist: where you wear your belt.",
    fitRule: "Size = your waist in inches.",
  },
  kids: {
    name: "Kids",
    columns: ["Height (cm)", "Chest (in)", "Age"],
    rows: [
      { size: "2-3Y", values: ["92-98", "21", "2-3 years"] },
      { size: "4-5Y", values: ["104-110", "23", "4-5 years"] },
      { size: "6-7Y", values: ["116-122", "25", "6-7 years"] },
      { size: "8-9Y", values: ["128-134", "27", "8-9 years"] },
      { size: "10-11Y", values: ["140-146", "29", "10-11 years"] },
    ],
    howToMeasure: "Go by height first; age is a rough guide.",
    fitRule: "If your child is between sizes, pick the bigger one.",
  },
  "women-inner": {
    name: "Women Innerwear",
    columns: ["Under-bust (in)", "Bust (in)"],
    rows: [
      { size: "32B", values: ["28", "33"] },
      { size: "34B", values: ["30", "35"] },
      { size: "36B", values: ["32", "37"] },
      { size: "38B", values: ["34", "39"] },
    ],
    howToMeasure: "Under-bust: snug around the rib cage just below the bust.",
    fitRule: "Innerwear is not exchangeable for hygiene reasons — please check the chart carefully.",
  },
  "men-inner": {
    name: "Men Innerwear",
    columns: ["Waist (in)", "Chest (in)"],
    rows: [
      { size: "S", values: ["28-30", "34-36"] },
      { size: "M", values: ["30-32", "36-38"] },
      { size: "L", values: ["32-34", "38-40"] },
      { size: "XL", values: ["34-36", "40-42"] },
    ],
    howToMeasure: "Waist for briefs/trunks; chest for vests.",
    fitRule: "Innerwear is not exchangeable for hygiene reasons.",
  },
} as const;

export const palette: Record<string, [string, string]> = {
  Maroon: ["#C9727A", "#7A1F2B"],
  Red: ["#EE8A8A", "#B3261E"],
  Pink: ["#F7C6D9", "#D9668E"],
  Peach: ["#FBD3BE", "#E0876A"],
  Mustard: ["#F0C987", "#B7792F"],
  Yellow: ["#FFE39A", "#E0B000"],
  Olive: ["#C9D9A8", "#6D8A3C"],
  Green: ["#9DC7A7", "#2F7D4F"],
  Teal: ["#9ED6CE", "#0F766E"],
  "Sky Blue": ["#BFD8F0", "#5A8CC9"],
  Blue: ["#AFC4D8", "#2E4E7E"],
  Navy: ["#8E9DBA", "#1F2D4F"],
  Purple: ["#D4C4EA", "#6C4AA0"],
  White: ["#FFFFFF", "#D9D6D0"],
  Cream: ["#FBF3E4", "#D9C7A6"],
  Beige: ["#EADBC8", "#B09A7C"],
  Grey: ["#D6D6D6", "#7C7C7C"],
  Black: ["#8A8A8A", "#1A1A1A"],
  Brown: ["#D4B59B", "#7A5234"],
};

type Tpl = {
  cat: string;
  gender: Cat["gender"];
  names: string[];
  price: [number, number];
  sizes: string[];
  colours: string[];
  attrs: Record<string, string[]>;
  innerwear?: boolean;
  set?: string;
};

export const templates: Tpl[] = [
  {
    cat: "kurta-sets", gender: "WOMEN", price: [899, 2799], sizes: ["S", "M", "L", "XL", "XXL"],
    colours: ["Maroon", "Pink", "Mustard", "Teal", "Blue", "Olive"],
    names: [
      "Cotton Printed Kurta Set with Dupatta", "Rayon Straight Kurta Pant Set", "Chanderi Embroidered Suit Set",
      "Georgette Anarkali Kurta Set", "Block Print Cotton Suit Set", "Festive Silk Blend Kurta Set",
      "Mul Cotton Everyday Kurta Set", "Chikankari Style Kurta Palazzo Set",
    ],
    attrs: { occasion: ["Daily", "Office", "Festive", "Wedding Guest"], fabric: ["Cotton", "Rayon", "Chanderi", "Georgette", "Mul", "Silk Blend"], sleeve: ["3/4 Sleeves", "Full Sleeves", "Sleeveless"], length: ["Calf Length", "Knee Length", "Ankle Length"], neck: ["Round Neck", "V Neck", "Mandarin Collar"], pattern: ["Printed", "Embroidered", "Solid"] },
    set: "Kurta, Pant, Dupatta",
  },
  {
    cat: "kurtis", gender: "WOMEN", price: [449, 1499], sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    colours: ["Olive", "Peach", "White", "Navy", "Red", "Yellow"],
    names: [
      "Everyday Rayon Kurti", "A-Line Cotton Printed Kurti", "Short Linen Kurti", "Straight Office Kurta",
      "Flared Anarkali Kurti", "Hand Block Print Kurti", "Solid Cotton Slub Kurta", "Plus Size Cotton Kurti", "Kaftan Style Rayon Kurta",
    ],
    attrs: { occasion: ["Daily", "Office"], fabric: ["Rayon", "Cotton", "Linen"], sleeve: ["3/4 Sleeves", "Short Sleeves"], length: ["Knee Length", "Hip Length", "Calf Length"], neck: ["Round Neck", "Notch Neck"], pattern: ["Printed", "Solid"] },
  },
  {
    cat: "sarees", gender: "WOMEN", price: [799, 3499], sizes: ["Free Size"],
    colours: ["Maroon", "Green", "Pink", "Purple", "Mustard"],
    names: ["Cotton Silk Saree with Blouse Piece", "Georgette Printed Saree", "Banarasi Style Festive Saree", "Daily Wear Chiffon Saree", "Linen Saree with Tassels", "Bandhani Print Saree", "Kota Doria Saree"],
    attrs: { occasion: ["Festive", "Wedding Guest", "Daily"], fabric: ["Cotton Silk", "Georgette", "Chiffon", "Linen"], pattern: ["Woven", "Printed", "Solid"] },
    set: "Saree, Unstitched Blouse Piece",
  },
  {
    cat: "women-bottoms", gender: "WOMEN", price: [299, 799], sizes: ["S", "M", "L", "XL", "XXL"],
    colours: ["White", "Black", "Beige", "Navy", "Maroon"],
    names: ["Cotton Straight Pants", "Rayon Palazzo", "Stretch Leggings", "Chiffon Printed Dupatta", "Cotton Churidar", "Cotton Salwar", "Phulkari Style Dupatta"],
    attrs: { occasion: ["Daily", "Office"], fabric: ["Cotton", "Rayon", "Lycra", "Chiffon"], pattern: ["Solid", "Printed"] },
  },
  {
    cat: "men-kurtas", gender: "MEN", price: [699, 2499], sizes: ["S", "M", "L", "XL", "XXL"],
    colours: ["White", "Sky Blue", "Maroon", "Cream", "Navy"],
    names: ["Men Linen Blend Short Kurta", "Cotton Kurta Pyjama Set", "Festive Silk Blend Kurta", "Men Nehru Jacket", "Chikan Style Cotton Kurta", "Men Sherwani Style Kurta Set"],
    attrs: { occasion: ["Festive", "Wedding Guest", "Daily"], fabric: ["Linen Blend", "Cotton", "Silk Blend"], sleeve: ["Full Sleeves"], pattern: ["Solid", "Embroidered"] },
  },
  {
    cat: "men-shirts", gender: "MEN", price: [599, 1499], sizes: ["S", "M", "L", "XL", "XXL"],
    colours: ["White", "Sky Blue", "Olive", "Grey", "Black"],
    names: ["Men Formal Cotton Shirt", "Casual Checked Shirt", "Linen Half Sleeve Shirt", "Oxford Office Shirt", "Printed Casual Shirt", "Denim Casual Shirt", "Mandarin Collar Linen Shirt"],
    attrs: { occasion: ["Office", "Daily"], fabric: ["Cotton", "Linen"], sleeve: ["Full Sleeves", "Short Sleeves"], pattern: ["Solid", "Checked", "Printed"] },
  },
  {
    cat: "men-tshirts", gender: "MEN", price: [299, 799], sizes: ["S", "M", "L", "XL", "XXL"],
    colours: ["Black", "White", "Navy", "Olive", "Maroon"],
    names: ["Men Round Neck Cotton T-Shirt", "Polo T-Shirt", "Oversized Graphic T-Shirt", "Henley Full Sleeve T-Shirt", "Sports Dry-Fit T-Shirt", "V-Neck Cotton T-Shirt", "Striped Polo T-Shirt"],
    attrs: { occasion: ["Daily"], fabric: ["Cotton", "Polyester"], sleeve: ["Short Sleeves", "Full Sleeves"], pattern: ["Solid", "Printed"] },
  },
  {
    cat: "men-jeans", gender: "MEN", price: [699, 1799], sizes: ["30", "32", "34", "36", "38"],
    colours: ["Blue", "Black", "Grey", "Beige"],
    names: ["Men Slim Fit Stretch Jeans", "Regular Fit Cotton Trousers", "Men Chinos", "Relaxed Fit Jeans", "Formal Trousers", "Cotton Cargo Pants", "Track Pants"],
    attrs: { occasion: ["Daily", "Office"], fabric: ["Denim", "Cotton"], pattern: ["Solid"] },
  },
  {
    cat: "girls", gender: "KIDS", price: [399, 1499], sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colours: ["Pink", "Mustard", "Purple", "Peach", "Teal"],
    names: ["Kids Festive Lehenga Choli", "Girls Cotton Frock", "Girls Kurta Sharara Set", "Girls Party Gown", "Girls Printed Top & Shorts", "Girls Anarkali Kurta Set"],
    attrs: { occasion: ["Festive", "Daily", "Wedding Guest"], fabric: ["Cotton", "Silk Blend", "Net"], recipient: ["Kids"] },
  },
  {
    cat: "boys", gender: "KIDS", price: [349, 1299], sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colours: ["Sky Blue", "Cream", "Maroon", "Navy", "Green"],
    names: ["Boys Kurta Pyjama Set", "Boys Cotton T-Shirt Pack", "Boys Denim Shorts", "Boys Festive Dhoti Kurta", "Boys Casual Shirt", "Boys Jogger Set"],
    attrs: { occasion: ["Festive", "Daily"], fabric: ["Cotton", "Denim", "Silk Blend"], recipient: ["Kids"] },
  },
  {
    cat: "women-innerwear", gender: "WOMEN", price: [199, 699], sizes: ["32B", "34B", "36B", "38B"],
    colours: ["Beige", "Black", "White", "Pink"],
    names: ["Cotton Everyday Bra", "Seamless T-Shirt Bra", "Cotton Camisole Pack of 2", "Women Hipster Briefs Pack of 3"],
    attrs: { occasion: ["Daily"], fabric: ["Cotton", "Nylon Spandex"] },
    innerwear: true,
  },
  {
    cat: "men-innerwear", gender: "MEN", price: [149, 599], sizes: ["S", "M", "L", "XL"],
    colours: ["White", "Grey", "Black", "Navy"],
    names: ["Men Cotton Vest Pack of 2", "Men Trunks Pack of 3", "Men Briefs Pack of 3", "Men Thermal Top"],
    attrs: { occasion: ["Daily"], fabric: ["Cotton", "Modal", "Wool"] },
    innerwear: true,
  },
];

export const localPincodes = [
  "302001", "302002", "302003", "302004", "302005", "302006", "302012", "302015", "302016", "302017",
  "302018", "302019", "302020", "302021", "302022", "302023", "302026", "302027", "302029", "302031",
  "302033", "302034", "302039", "303007", "303012", "303101", "303702", "303903", "303904", "303905",
];

export const reviewSnippets: { title: string; body: string; rating: number }[] = [
  { title: "Bahut accha fabric", body: "Fabric soft hai aur colour photo jaisa hi hai. Size bhi sahi aaya.", rating: 5 },
  { title: "Value for money", body: "Is price mein quality achhi hai. Ek wash ke baad bhi colour nahi gaya.", rating: 4 },
  { title: "Perfect fit", body: "Size chart follow kiya, fit ekdum perfect hai. Delivery bhi time pe hui.", rating: 5 },
  { title: "Good but slightly big", body: "Quality achhi hai, bas size thoda bada laga. Store pe exchange karwa liya, 5 minute laga.", rating: 4 },
  { title: "Loved it", body: "Mummy ke liye liya tha, unhe bahut pasand aaya.", rating: 5 },
  { title: "Okay okay", body: "Stitching theek hai, par colour thoda light hai photo se.", rating: 3 },
  { title: "Comfortable", body: "Garmi ke liye perfect hai, pura din pehen sakte hain.", rating: 5 },
  { title: "Nice for festivals", body: "Diwali pe pehna, sabne tareef ki.", rating: 5 },
  { title: "Slightly tight", body: "Kapda accha hai par thoda tight hai, ek size bada lena chahiye tha.", rating: 4 },
];

export const reviewerNames = ["Neha", "Rohit", "Pooja", "Amit", "Sunita", "Karan", "Priya", "Vikas", "Anjali", "Sanjay", "Meena", "Rahul", "Kavita", "Deepak", "Ritu"];
