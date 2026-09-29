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

const cols = [
  { k: "item", w: "34%", label: "Item" },
  { k: "hsn", w: "9%", label: "HSN" },
  { k: "qty", w: "6%", label: "Qty" },
  { k: "rate", w: "13%", label: "Rate (incl.)" },
  { k: "taxable", w: "14%", label: "Taxable" },
  { k: "gst", w: "12%", label: "GST" },
  { k: "total", w: "12%", label: "Total" },
];

export async function renderInvoice(order: Order & { items: OrderItem[] }) {
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
            <Text style={s.muted}>{shop.address}, {shop.state} {shop.pincode}</Text>
            <Text style={s.muted}>GSTIN: {shop.gstin} · {shop.phone}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold" }}>TAX INVOICE</Text>
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
            <Text>Place of supply: {order.shipState}</Text>
            <Text>{intraState ? "CGST + SGST" : "IGST"}</Text>
          </View>
        </View>
        <View style={s.row}>{cols.map((c) => (<Text key={c.k} style={[s.th, { width: c.w }]}>{c.label}</Text>))}</View>
        {rows.map(({ i, net, tax, taxable }) => (
          <View key={i.id} style={s.row} wrap={false}>
            <Text style={[s.td, { width: cols[0].w }]}>{i.productName} ({i.colour}, {i.size}) {"\n"}SKU {i.sku}</Text>
            <Text style={[s.td, { width: cols[1].w }]}>{i.hsn}</Text>
            <Text style={[s.td, { width: cols[2].w }]}>{i.qty}</Text>
            <Text style={[s.td, { width: cols[3].w }]}>{rs(i.unitPrice)}</Text>
            <Text style={[s.td, { width: cols[4].w }]}>{rs(taxable)}</Text>
            <Text style={[s.td, { width: cols[5].w }]}>{i.gstRate}%{"\n"}{rs(tax)}</Text>
            <Text style={[s.td, { width: cols[6].w }]}>{rs(net)}</Text>
          </View>
        ))}
        <View style={{ marginTop: 10, alignSelf: "flex-end", width: "45%" }}>
          <Text>Subtotal (MRP-inclusive prices): {rs(order.subtotal)}</Text>
          {order.discount ? <Text>Coupon {order.couponCode}: -{rs(order.discount)}</Text> : null}
          {order.prepaidDiscount ? <Text>Prepaid discount: -{rs(order.prepaidDiscount)}</Text> : null}
          <Text>Shipping: {rs(order.shippingFee)}</Text>
          {order.codFee ? <Text>COD fee: {rs(order.codFee)}</Text> : null}
          {intraState ? (
            <>
              <Text>CGST: {rs(taxSum / 2)}</Text>
              <Text>SGST: {rs(taxSum / 2)}</Text>
            </>
          ) : (
            <Text>IGST: {rs(taxSum)}</Text>
          )}
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 4 }}>Grand total: {rs(order.total)}</Text>
        </View>
        <Text style={[s.muted, { marginTop: 24 }]}>All prices include GST. This is a computer-generated invoice and needs no signature.{shop.gstin === "GSTIN-PENDING" ? " (Demo: GSTIN not yet configured.)" : ""}</Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
