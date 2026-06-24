import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';

const pricesCollection = collection(db, 'precios_presentacion');

const presentationOrder = {
  decant_3ml: 1,
  decant_5ml: 2,
  decant_10ml: 3,
  botella_completa: 4,
};

export const presentationTypes = [
  { label: '3 ml', value: 'decant_3ml', ml: 3 },
  { label: '5 ml', value: 'decant_5ml', ml: 5 },
  { label: '10 ml', value: 'decant_10ml', ml: 10 },
  { label: 'Botella', value: 'botella_completa', ml: 0 },
];

export function listenPresentationPrices(perfumeId, onPricesChange, onError) {
  const pricesQuery = query(pricesCollection, where('perfume_id', '==', perfumeId));

  return onSnapshot(
    pricesQuery,
    (snapshot) => {
      const activePrices = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((price) => price.activo);

      const pricesByType = activePrices.reduce((summary, price) => {
        const currentPrice = summary[price.tipo];

        if (!currentPrice) {
          return {
            ...summary,
            [price.tipo]: price,
          };
        }

        return summary;
      }, {});

      const prices = Object.values(pricesByType)
        .sort((a, b) => {
          const firstOrder = presentationOrder[a.tipo] || 99;
          const secondOrder = presentationOrder[b.tipo] || 99;

          return firstOrder - secondOrder;
        });

      onPricesChange(prices);
    },
    onError
  );
}

export function listenAllPresentationPrices(onPricesChange, onError) {
  return onSnapshot(
    pricesCollection,
    (snapshot) => {
      const prices = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((price) => price.activo)
        .sort((a, b) => {
          const firstOrder = presentationOrder[a.tipo] || 99;
          const secondOrder = presentationOrder[b.tipo] || 99;

          return firstOrder - secondOrder;
        });

      onPricesChange(prices);
    },
    onError
  );
}

export async function savePresentationPrice(perfume, priceData) {
  const selectedType = presentationTypes.find((type) => type.value === priceData.tipo);
  const pricesQuery = query(
    pricesCollection,
    where('perfume_id', '==', perfume.id),
    where('tipo', '==', priceData.tipo),
    where('activo', '==', true)
  );
  const snapshot = await getDocs(pricesQuery);
  const bottleMl = Number(perfume.ml_botella_completa) || 0;
  const presentationMl =
    priceData.tipo === 'botella_completa'
      ? bottleMl
      : selectedType?.ml || Number(priceData.ml) || 0;

  const pricePayload = {
    perfume_id: perfume.id,
    tipo: priceData.tipo,
    ml: presentationMl,
    precio_publico: Number(priceData.precio_publico) || 0,
    activo: true,
    updated_at: serverTimestamp(),
  };

  if (!snapshot.empty) {
    const firstPrice = snapshot.docs[0];
    const duplicatedPrices = snapshot.docs.slice(1);
    const duplicateUpdates = duplicatedPrices.map((priceDoc) =>
      updateDoc(doc(db, 'precios_presentacion', priceDoc.id), {
        activo: false,
        updated_at: serverTimestamp(),
      })
    );

    await Promise.all(duplicateUpdates);

    return updateDoc(doc(db, 'precios_presentacion', firstPrice.id), pricePayload);
  }

  return addDoc(pricesCollection, {
    ...pricePayload,
    created_at: serverTimestamp(),
  });
}

export async function deactivatePresentationPrice(priceId) {
  return updateDoc(doc(db, 'precios_presentacion', priceId), {
    activo: false,
    updated_at: serverTimestamp(),
  });
}

export async function cleanupDuplicatePresentationPrices(perfumeId) {
  const pricesQuery = query(pricesCollection, where('perfume_id', '==', perfumeId));
  const snapshot = await getDocs(pricesQuery);
  const activePricesByType = {};
  const updates = [];

  snapshot.docs.forEach((priceDoc) => {
    const price = priceDoc.data();

    if (!price.activo) {
      return;
    }

    if (!activePricesByType[price.tipo]) {
      activePricesByType[price.tipo] = priceDoc.id;
      return;
    }

    updates.push(
      updateDoc(doc(db, 'precios_presentacion', priceDoc.id), {
        activo: false,
        updated_at: serverTimestamp(),
      })
    );
  });

  return Promise.all(updates);
}
