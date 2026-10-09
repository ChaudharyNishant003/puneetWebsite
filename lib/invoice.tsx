import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Order, OrderItem } from "@prisma/client";
import { shop } from "./config";
import { includedTax } from "./pricing";

// Built-in PDF fonts have no ₹ glyph, so amounts use "Rs.".
const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#8e1b3a", letterSpacing: 1.5 },
  row: { flexDirection: "row" },
  box: { borderWidth: 1, borderColor: "#dddddd", padding: 8, flex: 1 },
  th: { fontFamily: "Helvetica-Bold", backgroundColor: "#f4f4f4", padding: 4, borderBottomWidth: 1, borderColor: "#dddddd" },
  td: { padding: 4, borderBottomWidth: 1, borderColor: "#eeeeee" },
  muted: { color: "#6e6e73" },
});

const GST_COLS = [
  { k: "item", w: "34%", label: "Item" },
  { k: "hsn", w: "9%", label: "HSN" },
  { k: "qty", w: "6%", label: "Qty" },
  { k: "rate", w: "13%", label: "Rate (incl.)" },
  { k: "taxable", w: "14%", label: "Taxable" },
  { k: "gst", w: "12%", label: "GST" },
  { k: "total", w: "12%", label: "Total" },
];
// Seller not registered under GST: a plain invoice with no tax breakup.
const PLAIN_COLS = [
  { k: "item", w: "55%", label: "Item" },
  { k: "qty", w: "10%", label: "Qty" },
  { k: "rate", w: "17%", label: "Rate" },
  { k: "total", w: "18%", label: "Total" },
];

export async function renderInvoice(order: Order & { items: OrderItem[] }) {
  const gst = Boolean(shop.gstin);
  const cols = gst ? GST_COLS : PLAIN_COLS;
  const intraState = order.shipState.toLowerCase() === shop.state.toLowerCase();
  const discountTotal = order.discount + order.prepaidDiscount;
  const rows = order.items.map((i) => {
    const gross = i.unitPrice * i.qty;
    const share = order.subtotal ? (gross / order.subtotal) * discountTotal : 0;
    const net = gross - share;
    const tax = includedTax(net, i.gstRate);
    return { i, net, tax, taxable: net - tax };
  });
  const taxSum = rows.reduce((a, r) => a + r.tax, 0);

  const doc = (
    <Document title={`Invoice ${order.number}`} author={shop.name}>
      <Page size="A4" style={s.page}>
        <View style={[s.row, { justifyContent: "space-between", marginBottom: 14 }]}>
          <View>
            <Text style={s.h1}>{shop.name.toUpperCase()}</Text>
            {shop.address ? <Text style={s.muted}>{shop.address}, {shop.state} {shop.pincode}</Text> : null}
            <Text style={s.muted}>{gst ? `GSTIN: ${shop.gstin} · ` : ""}{shop.phone} · {shop.email}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold" }}>{gst ? "TAX INVOICE" : "INVOICE"}</Text>
            <Text>Invoice no: INV-{order.number}</Text>
            <Text>Date: {(order.placedAt ?? order.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</Text>
            <Text>Order: {order.number}</Text>
          </View>
        </View>
        <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
          <View style={s.box}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Bill / Ship to</Text>
            <Text>{order.shipName} · {order.shipPhone}</Text>
            <Text>{order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}</Text>
            <Text>{order.shipCity}, {order.shipState} {order.shipPincode}</Text>
          </View>
          <View style={s.box}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Payment</Text>
            <Text>{order.paymentMethod === "COD" ? "Cash on Delivery" : "Prepaid (online)"}</Text>
            {gst ? <Text>Place of supply: {order.shipState}</Text> : null}
            {gst ? <Text>{intraState ? "CGST + SGST" : "IGST"}</Text> : null}
          </View>
        </View>
        <View style={s.row}>{cols.map((c) => (<Text key={c.k} style={[s.th, { width: c.w }]}>{c.label}</Text>))}</View>
        {rows.map(({ i, net, tax, taxable }) => {
          const cell: Record<string, string> = {
            item: `${i.productName} (${i.colour}, ${i.size}) \nSKU ${i.sku}`,
            hsn: i.hsn,
            qty: String(i.qty),
            rate: rs(i.unitPrice),
            taxable: rs(taxable),
            gst: `${i.gstRate}%\n${rs(tax)}`,
            total: rs(net),
          };
          return (
            <View key={i.id} style={s.row} wrap={false}>
              {cols.map((c) => (<Text key={c.k} style={[s.td, { width: c.w }]}>{cell[c.k]}</Text>))}
            </View>
          );
        })}
        <View style={{ marginTop: 10, alignSelf: "flex-end", width: "45%" }}>
          <Text>Subtotal (MRP-inclusive prices): {rs(order.subtotal)}</Text>
          {order.discount ? <Text>Coupon {order.couponCode}: -{rs(order.discount)}</Text> : null}
          {order.prepaidDiscount ? <Text>Prepaid discount: -{rs(order.prepaidDiscount)}</Text> : null}
          <Text>Shipping: {rs(order.shippingFee)}</Text>
          {order.codFee ? <Text>COD fee: {rs(order.codFee)}</Text> : null}
          {!gst ? null : intraState ? (
            <>
              <Text>CGST: {rs(taxSum / 2)}</Text>
              <Text>SGST: {rs(taxSum / 2)}</Text>
            </>
          ) : (
            <Text>IGST: {rs(taxSum)}</Text>
          )}
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 4 }}>Grand total: {rs(order.total)}</Text>
        </View>
        <Text style={[s.muted, { marginTop: 24 }]}>
          {gst ? "All prices include GST. " : "The seller is not registered under GST, so no GST is charged. "}This is a computer-generated invoice and needs no signature.
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
