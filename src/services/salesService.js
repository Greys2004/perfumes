import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';

const salesCollection = collection(db, 'ventas');
const saleDetailsCollection = collection(db, 'detalle_venta');
const paymentsCollection = collection(db, 'pagos');
const inventoryMovementsCollection = collection(db, 'movimientos_inventario');

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function listenPendingSales(onSalesChange, onError) {
  const salesQuery = query(salesCollection, where('estado_pago', 'in', ['pendiente', 'parcial']));

  return onSnapshot(
    salesQuery,
    (snapshot) => {
      const sales = snapshot.docs.map((saleDoc) => ({
        id: saleDoc.id,
        ...saleDoc.data(),
      }));

      onSalesChange(sales);
    },
    onError
  );
}

function getPaymentStatus(total, initialPayment) {
  if (initialPayment >= total) {
    return 'pagado';
  }

  if (initialPayment > 0) {
    return 'parcial';
  }

  return 'pendiente';
}

function normalizePaymentPromises(saleData) {
  const promises = Array.isArray(saleData.fechas_pago_promesa)
    ? saleData.fechas_pago_promesa
    : [];

  return promises
    .map((paymentPromise) => ({
      id: paymentPromise.id || `${Date.now()}`,
      fecha: paymentPromise.fecha || saleData.fecha_pago_promesa || '',
      monto: Number(paymentPromise.monto) || 0,
    }))
    .filter((paymentPromise) => paymentPromise.fecha);
}

function normalizeSaleItems(saleData) {
  if (Array.isArray(saleData.items) && saleData.items.length > 0) {
    return saleData.items.map((item) => ({
      perfume_id: item.perfume_id,
      tipo_producto: item.tipo_producto,
      ml_vendidos: Number(item.ml_vendidos) || 0,
      cantidad: Number(item.cantidad) || 1,
      precio_unitario: Number(item.precio_unitario) || 0,
      subtotal: Number(item.subtotal) || 0,
      compra_ids: item.compra_ids?.length
        ? item.compra_ids
        : [item.compra_id].filter(Boolean),
    }));
  }

  return [
    {
      perfume_id: saleData.perfume_id,
      tipo_producto: saleData.tipo_producto,
      ml_vendidos: Number(saleData.ml_vendidos) || 0,
      cantidad: Number(saleData.cantidad) || 1,
      precio_unitario: Number(saleData.precio_unitario) || 0,
      subtotal: Number(saleData.total) || 0,
      compra_ids: saleData.compra_ids?.length
        ? saleData.compra_ids
        : [saleData.compra_id].filter(Boolean),
    },
  ];
}

async function updateSalePaymentStatus(saleId) {
  const saleRef = doc(db, 'ventas', saleId);
  const saleSnapshot = await getDoc(saleRef);

  if (!saleSnapshot.exists()) {
    return;
  }

  const sale = saleSnapshot.data();
  const total = Number(sale.total) || 0;
  const paymentsQuery = query(paymentsCollection, where('venta_id', '==', saleId));
  const paymentsSnapshot = await getDocs(paymentsQuery);
  const paid = paymentsSnapshot.docs.reduce(
    (sum, paymentDoc) => sum + (Number(paymentDoc.data().monto) || 0),
    0
  );

  return updateDoc(saleRef, { estado_pago: getPaymentStatus(total, paid) });
}

export function listenAllSaleDetails(onDetailsChange, onError) {
  return onSnapshot(
    saleDetailsCollection,
    (snapshot) => {
      const details = snapshot.docs.map((detailDoc) => ({
        id: detailDoc.id,
        ...detailDoc.data(),
      }));

      onDetailsChange(details);
    },
    onError
  );
}

export function listenAllSales(onSalesChange, onError) {
  return onSnapshot(
    salesCollection,
    (snapshot) => {
      const sales = snapshot.docs
        .map((saleDoc) => ({
          id: saleDoc.id,
          ...saleDoc.data(),
        }))
        .filter((sale) => sale.estado_pago !== 'cancelada');

      onSalesChange(sales);
    },
    onError
  );
}

export function listenPaymentsBySale(saleId, onPaymentsChange, onError) {
  const paymentsQuery = query(paymentsCollection, where('venta_id', '==', saleId));

  return onSnapshot(
    paymentsQuery,
    (snapshot) => {
      const payments = snapshot.docs.map((paymentDoc) => ({
        id: paymentDoc.id,
        ...paymentDoc.data(),
      }));

      onPaymentsChange(payments);
    },
    onError
  );
}

export async function createSale(saleData) {
  const total = Number(saleData.total) || 0;
  const initialPayment = Number(saleData.pago_inicial) || 0;
  const saleItems = normalizeSaleItems(saleData);
  const purchaseIds = [...new Set(saleItems.flatMap((item) => item.compra_ids))];
  const purchaseRefs = purchaseIds.map((purchaseId) => doc(db, 'compras', purchaseId));
  const paymentPromises = normalizePaymentPromises(saleData);
  const firstPromiseDate = paymentPromises[0]?.fecha || '';

  return runTransaction(db, async (transaction) => {
    const stockByPurchaseId = {};

    for (const purchaseRef of purchaseRefs) {
      const purchaseSnapshot = await transaction.get(purchaseRef);

      if (!purchaseSnapshot.exists()) {
        throw new Error('No se encontro una de las compras seleccionadas para descontar stock.');
      }

      const purchase = purchaseSnapshot.data();
      const currentMl = Number(purchase.ml_restantes) || 0;

      stockByPurchaseId[purchaseSnapshot.id] = {
        id: purchaseSnapshot.id,
        ref: purchaseRef,
        currentMl,
      };
    }

    const remainingStockByPurchaseId = purchaseIds.reduce((summary, purchaseId) => ({
      ...summary,
      [purchaseId]: stockByPurchaseId[purchaseId]?.currentMl || 0,
    }), {});

    saleItems.forEach((item) => {
      const totalAvailableMl = item.compra_ids.reduce(
        (sum, purchaseId) => sum + (remainingStockByPurchaseId[purchaseId] || 0),
        0
      );

      if (item.ml_vendidos <= 0 || item.compra_ids.length === 0) {
        throw new Error('Cada producto de la venta debe tener mililitros y compras de inventario seleccionadas.');
      }

      if (item.ml_vendidos > totalAvailableMl) {
        throw new Error(`Solo hay ${totalAvailableMl} ml disponibles en las compras seleccionadas.`);
      }

      let remainingMl = item.ml_vendidos;
      item.compra_ids
        .map((purchaseId) => ({
          id: purchaseId,
          currentMl: remainingStockByPurchaseId[purchaseId] || 0,
        }))
        .filter((source) => source.currentMl > 0)
        .sort((a, b) => a.currentMl - b.currentMl)
        .forEach((source) => {
          if (remainingMl <= 0) {
            return;
          }

          const mlFromPurchase = Math.min(source.currentMl, remainingMl);
          remainingStockByPurchaseId[source.id] -= mlFromPurchase;
          remainingMl -= mlFromPurchase;
        });
    });

    Object.keys(remainingStockByPurchaseId).forEach((purchaseId) => {
      remainingStockByPurchaseId[purchaseId] = stockByPurchaseId[purchaseId]?.currentMl || 0;
    });

    if (saleItems.length === 0) {
      throw new Error('Agrega al menos un producto a la venta.');
    }

    const saleRef = doc(salesCollection);
    const now = serverTimestamp();

    transaction.set(saleRef, {
      cliente_id: saleData.cliente_id,
      fecha_venta: saleData.fecha_venta,
      fecha_pago_promesa: firstPromiseDate,
      fechas_pago_promesa: paymentPromises,
      total,
      estado_pago: getPaymentStatus(total, initialPayment),
      notas: saleData.notas.trim(),
      compra_ids: purchaseIds,
      productos_count: saleItems.length,
      created_at: now,
    });

    saleItems.forEach((item) => {
      let remainingMl = item.ml_vendidos;

      item.compra_ids
        .map((purchaseId) => ({
          id: purchaseId,
          ref: stockByPurchaseId[purchaseId].ref,
          currentMl: remainingStockByPurchaseId[purchaseId] || 0,
        }))
        .filter((source) => source.currentMl > 0)
        .sort((a, b) => a.currentMl - b.currentMl)
        .forEach((source, index) => {
          if (remainingMl <= 0) {
            return;
          }

          const mlFromPurchase = Math.min(source.currentMl, remainingMl);
          const detailRef = doc(saleDetailsCollection);
          const movementRef = doc(inventoryMovementsCollection);
          const ratio = item.ml_vendidos > 0 ? mlFromPurchase / item.ml_vendidos : 0;

          transaction.set(detailRef, {
            venta_id: saleRef.id,
            perfume_id: item.perfume_id,
            compra_id: source.id,
            tipo_producto: item.tipo_producto,
            ml_vendidos: mlFromPurchase,
            cantidad: index === 0 ? item.cantidad : 0,
            precio_unitario: item.precio_unitario,
            subtotal: Number((item.subtotal * ratio).toFixed(2)),
          });

          transaction.set(movementRef, {
            compra_id: source.id,
            tipo: 'salida_venta',
            ml: mlFromPurchase,
            referencia: saleRef.id,
            fecha: saleData.fecha_venta,
            notas: `Venta registrada por ${mlFromPurchase} ml`,
          });

          remainingStockByPurchaseId[source.id] -= mlFromPurchase;
          remainingMl -= mlFromPurchase;
        });
    });

    purchaseIds.forEach((purchaseId) => {
      transaction.update(stockByPurchaseId[purchaseId].ref, {
        ml_restantes: remainingStockByPurchaseId[purchaseId],
      });
    });

    if (initialPayment > 0) {
      const paymentRef = doc(paymentsCollection);

      transaction.set(paymentRef, {
        venta_id: saleRef.id,
        monto: initialPayment,
        metodo_pago: saleData.metodo_pago.trim() || 'No especificado',
        fecha_pago: saleData.fecha_venta,
        notas: 'Pago inicial',
      });
    }

    return saleRef.id;
  });
}

export async function addPaymentToSale(saleId, paymentData) {
  const paymentAmount = Number(paymentData.monto) || 0;

  await addDoc(paymentsCollection, {
    venta_id: saleId,
    monto: paymentAmount,
    metodo_pago: paymentData.metodo_pago.trim() || 'No especificado',
    fecha_pago: paymentData.fecha_pago,
    notas: paymentData.notas.trim(),
  });

  return updateSalePaymentStatus(saleId);
}

export async function registerSaleCollectionOutcome(saleId, outcomeData) {
  const saleRef = doc(db, 'ventas', saleId);
  const saleSnapshot = await getDoc(saleRef);

  if (!saleSnapshot.exists()) {
    throw new Error('No se encontro la venta para registrar la cobranza.');
  }

  const currentHistory = Array.isArray(saleSnapshot.data().historial_cobranza)
    ? saleSnapshot.data().historial_cobranza
    : [];

  return updateDoc(saleRef, {
    historial_cobranza: [
      ...currentHistory,
      {
        id: `${Date.now()}`,
        fecha: outcomeData.fecha,
        estado: outcomeData.estado,
        monto: Number(outcomeData.monto) || 0,
        notas: outcomeData.notas?.trim() || '',
        created_at: getLocalDateString(),
      },
    ],
    updated_at: serverTimestamp(),
  });
}

export async function updatePayment(saleId, paymentId, paymentData) {
  await updateDoc(doc(db, 'pagos', paymentId), {
    monto: Number(paymentData.monto) || 0,
    metodo_pago: paymentData.metodo_pago.trim() || 'No especificado',
    fecha_pago: paymentData.fecha_pago,
    notas: paymentData.notas.trim(),
  });

  return updateSalePaymentStatus(saleId);
}

export async function deletePayment(saleId, paymentId) {
  await deleteDoc(doc(db, 'pagos', paymentId));

  return updateSalePaymentStatus(saleId);
}

export async function updateSaleBasic(saleId, saleData) {
  const paymentPromises = normalizePaymentPromises(saleData);
  const firstPromiseDate = paymentPromises[0]?.fecha || '';

  await updateDoc(doc(db, 'ventas', saleId), {
    fecha_venta: saleData.fecha_venta,
    fecha_pago_promesa: firstPromiseDate,
    fechas_pago_promesa: paymentPromises,
    total: Number(saleData.total) || 0,
    notas: saleData.notas.trim(),
  });

  return updateSalePaymentStatus(saleId);
}

export async function updateSalePaymentPromises(saleId, paymentPromises) {
  const normalizedPromises = normalizePaymentPromises({
    fechas_pago_promesa: paymentPromises,
  });

  return updateDoc(doc(db, 'ventas', saleId), {
    fecha_pago_promesa: normalizedPromises[0]?.fecha || '',
    fechas_pago_promesa: normalizedPromises,
    updated_at: serverTimestamp(),
  });
}

export async function cancelSale(saleId) {
  const detailsQuery = query(saleDetailsCollection, where('venta_id', '==', saleId));
  const detailsSnapshot = await getDocs(detailsQuery);

  return runTransaction(db, async (transaction) => {
    const saleRef = doc(db, 'ventas', saleId);
    const stockRestores = [];

    for (const detailDoc of detailsSnapshot.docs) {
      const detail = detailDoc.data();
      const purchaseRef = doc(db, 'compras', detail.compra_id);
      const purchaseSnapshot = await transaction.get(purchaseRef);
      const currentMl = purchaseSnapshot.exists()
        ? Number(purchaseSnapshot.data().ml_restantes) || 0
        : 0;
      const mlToRestore = Number(detail.ml_vendidos) || 0;

      stockRestores.push({
        detail,
        purchaseRef,
        currentMl,
        mlToRestore,
      });
    }

    stockRestores.forEach(({ detail, purchaseRef, currentMl, mlToRestore }) => {
      const movementRef = doc(inventoryMovementsCollection);
      transaction.set(movementRef, {
        compra_id: detail.compra_id,
        tipo: 'entrada_cancelacion',
        ml: mlToRestore,
        referencia: saleId,
        fecha: getLocalDateString(),
        notas: 'Stock restaurado por venta cancelada',
      });

      transaction.update(purchaseRef, {
        ml_restantes: currentMl + mlToRestore,
      });
    });

    transaction.update(saleRef, {
      estado_pago: 'cancelada',
      updated_at: serverTimestamp(),
    });
  });
}
