import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { db } from '../config/firebase';

const salesCollection = collection(db, 'ventas');
const paymentsCollection = collection(db, 'pagos');

export function listenSalesByClient(clientId, onSalesChange, onError) {
  const salesQuery = query(salesCollection, where('cliente_id', '==', clientId));

  return onSnapshot(
    salesQuery,
    (snapshot) => {
      const sales = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).filter((sale) => sale.estado_pago !== 'cancelada');

      onSalesChange(sales);
    },
    onError
  );
}

export function listenAllPayments(onPaymentsChange, onError) {
  return onSnapshot(
    paymentsCollection,
    (snapshot) => {
      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      onPaymentsChange(payments);
    },
    onError
  );
}

export function calculateClientAccount(sales, payments) {
  const saleIds = sales.map((sale) => sale.id);
  const clientPayments = payments.filter((payment) => saleIds.includes(payment.venta_id));

  const totalComprado = sales.reduce((total, sale) => total + (Number(sale.total) || 0), 0);
  const totalPagado = clientPayments.reduce(
    (total, payment) => total + (Number(payment.monto) || 0),
    0
  );

  return {
    totalComprado,
    totalPagado,
    deuda: totalComprado - totalPagado,
  };
}
