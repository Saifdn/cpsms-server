export const easyparcelStatusMap = {
  1: { code: 1, label: "Order Created", status: "draft", color: "gray" },
  2: { code: 2, label: "Payment Confirmed", status: "confirmed", color: "blue" },
  3: { code: 3, label: "Ready for Collection", status: "ready", color: "yellow" },
  4: { code: 4, label: "Item Collected", status: "in_transit", color: "amber" },
  5: { code: 5, label: "In Transit to Hub", status: "in_transit", color: "amber" },
  6: { code: 6, label: "Processing at Hub", status: "in_transit", color: "amber" },
  7: { code: 7, label: "Schedule In Arrangement", status: "in_transit", color: "amber" },
  8: { code: 8, label: "Out for Delivery", status: "out_for_delivery", color: "purple" },
  9: { code: 9, label: "Delivered", status: "delivered", color: "green" },
  10: { code: 10, label: "Delivery Failed", status: "failed", color: "red" },
  11: { code: 11, label: "Return to Sender", status: "returned", color: "red" },
};

export const getShipmentStatus = (code) => {
  return easyparcelStatusMap[code] || { 
    code, 
    label: "Unknown Status", 
    status: "unknown", 
    color: "gray" 
  };
};

export const getStatusBadgeVariant = (code) => {
  const status = getShipmentStatus(code);
  switch (status.status) {
    case "delivered": return "default";
    case "in_transit": return "secondary";
    case "out_for_delivery": return "default";
    case "failed":
    case "returned": return "destructive";
    default: return "outline";
  }
};