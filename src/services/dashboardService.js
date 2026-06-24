import { collection, onSnapshot } from 'firebase/firestore';

import { db } from '../config/firebase';

export function listenCollection(collectionName, onDataChange, onError) {
  return onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      onDataChange(data);
    },
    onError
  );
}

export function calculateDashboardData({ purchases, sales, payments, saleDetails, perfumes }) {
  const activeSales = sales.filter((sale) => sale.estado_pago !== 'cancelada');
  const activeSaleIds = activeSales.map((sale) => sale.id);
  const activeSaleDetails = saleDetails.filter((detail) => activeSaleIds.includes(detail.venta_id));
  const activePayments = payments.filter((payment) => activeSaleIds.includes(payment.venta_id));

  const totalGastado = purchases.reduce((total, purchase) => {
    const discountedCost = Number(purchase.costo_con_descuento) || 0;
    const normalCost = Number(purchase.costo_compra) || 0;

    return total + (purchase.tuvo_descuento && discountedCost ? discountedCost : normalCost);
  }, 0);

  const totalVendido = activeSales.reduce((total, sale) => total + (Number(sale.total) || 0), 0);
  const totalPagado = activePayments.reduce((total, payment) => total + (Number(payment.monto) || 0), 0);
  const deudaClientes = totalVendido - totalPagado;

  const perfumeNamesById = perfumes.reduce((names, perfume) => {
    return {
      ...names,
      [perfume.id]: perfume.nombre,
    };
  }, {});

  const perfumeMlById = perfumes.reduce((sizes, perfume) => {
    return {
      ...sizes,
      [perfume.id]: Number(perfume.ml_botella_completa) || 0,
    };
  }, {});

  const stockByPerfume = purchases.reduce((summary, purchase) => {
    const perfumeId = purchase.perfume_id || 'sin_perfume';
    const current = summary[perfumeId] || {
      perfume_id: perfumeId,
      nombre: perfumeNamesById[perfumeId] || 'Perfume sin nombre',
      ml_restantes: 0,
      ml_botella_completa: perfumeMlById[perfumeId] || 0,
      compras_con_stock: 0,
    };
    const remainingMl = Number(purchase.ml_restantes) || 0;

    return {
      ...summary,
      [perfumeId]: {
        ...current,
        ml_restantes: current.ml_restantes + remainingMl,
        compras_con_stock: current.compras_con_stock + (remainingMl > 0 ? 1 : 0),
      },
    };
  }, {});

  const stockBajo = Object.values(stockByPerfume)
    .filter((perfumeStock) => perfumeStock.ml_restantes <= 10)
    .sort((a, b) => a.ml_restantes - b.ml_restantes);

  const inventarioPorPerfume = Object.values(stockByPerfume)
    .map((perfumeStock) => ({
      ...perfumeStock,
      botellas_restantes: perfumeStock.ml_botella_completa
        ? perfumeStock.ml_restantes / perfumeStock.ml_botella_completa
        : 0,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const perfumesMenosStock = [...inventarioPorPerfume]
    .sort((a, b) => a.ml_restantes - b.ml_restantes)
    .slice(0, 5);

  const soldByPerfume = activeSaleDetails.reduce((summary, detail) => {
    const perfumeId = detail.perfume_id;
    const current = summary[perfumeId] || {
      perfume_id: perfumeId,
      nombre: perfumeNamesById[perfumeId] || 'Perfume sin nombre',
      ml_vendidos: 0,
      total_vendido: 0,
    };

    return {
      ...summary,
      [perfumeId]: {
        ...current,
        ml_vendidos: current.ml_vendidos + (Number(detail.ml_vendidos) || 0),
        total_vendido: current.total_vendido + (Number(detail.subtotal) || 0),
      },
    };
  }, {});

  const perfumesMasVendidos = Object.values(soldByPerfume)
    .sort((a, b) => b.ml_vendidos - a.ml_vendidos)
    .slice(0, 5);

  return {
    totalGastado,
    totalVendido,
    totalPagado,
    gananciaVendida: totalVendido - totalGastado,
    gananciaCobrada: totalPagado - totalGastado,
    gastadoMenosPagado: totalGastado - totalPagado,
    deudaClientes,
    stockBajo,
    inventarioPorPerfume,
    perfumesMenosStock,
    perfumesMasVendidos,
  };
}
