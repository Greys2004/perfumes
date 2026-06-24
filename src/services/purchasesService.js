import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';

const purchasesCollection = collection(db, 'compras');

function getPurchaseDateValue(purchase) {
  return formatDateValue(purchase.fecha_compra);
}

export function formatDateValue(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }

  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  }

  return String(value);
}

export function listenPurchasesByPerfume(perfumeId, onPurchasesChange, onError) {
  const purchasesQuery = query(purchasesCollection, where('perfume_id', '==', perfumeId));

  return onSnapshot(
    purchasesQuery,
    (snapshot) => {
      const purchases = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => getPurchaseDateValue(b).localeCompare(getPurchaseDateValue(a)));

      onPurchasesChange(purchases);
    },
    onError
  );
}

export async function createPurchase(perfumeId, purchaseData) {
  const mlIniciales = Number(purchaseData.ml_iniciales) || 0;
  const costoCompra = Number(purchaseData.costo_compra) || 0;
  const costoConDescuento = Number(purchaseData.costo_con_descuento) || 0;

  const newPurchase = {
    perfume_id: perfumeId,
    ml_iniciales: mlIniciales,
    ml_restantes: mlIniciales,
    costo_compra: costoCompra,
    tuvo_descuento: purchaseData.tuvo_descuento,
    costo_con_descuento: purchaseData.tuvo_descuento ? costoConDescuento : 0,
    fecha_compra: purchaseData.fecha_compra.trim(),
    proveedor: purchaseData.proveedor.trim(),
    notas: purchaseData.notas.trim(),
    created_at: serverTimestamp(),
  };

  return addDoc(purchasesCollection, newPurchase);
}

export async function updatePurchaseStock(purchaseId, stockData) {
  const mlRestantes = Number(stockData.ml_restantes) || 0;
  const safeMlRestantes = Math.max(mlRestantes, 0);

  return updateDoc(doc(db, 'compras', purchaseId), {
    ml_restantes: safeMlRestantes,
    notas_ajuste_stock: stockData.notas_ajuste_stock.trim(),
    updated_at: serverTimestamp(),
  });
}

export function calculateTotalStock(purchases) {
  return purchases.reduce((total, purchase) => total + (Number(purchase.ml_restantes) || 0), 0);
}
