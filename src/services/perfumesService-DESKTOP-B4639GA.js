import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../config/firebase';

const perfumesCollection = collection(db, 'perfumes');

export function listenActivePerfumes(onPerfumesChange, onError) {
  const perfumesQuery = query(perfumesCollection, orderBy('created_at', 'desc'));

  return onSnapshot(
    perfumesQuery,
    (snapshot) => {
      const perfumes = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((perfume) => perfume.activo);

      onPerfumesChange(perfumes);
    },
    onError
  );
}

export function listenInactivePerfumes(onPerfumesChange, onError) {
  const perfumesQuery = query(perfumesCollection, orderBy('updated_at', 'desc'));

  return onSnapshot(
    perfumesQuery,
    (snapshot) => {
      const perfumes = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((perfume) => perfume.activo === false);

      onPerfumesChange(perfumes);
    },
    onError
  );
}

export async function createPerfume(perfumeData) {
  const now = serverTimestamp();

  const newPerfume = {
    nombre: perfumeData.nombre.trim(),
    marca: perfumeData.marca.trim(),
    imagen: perfumeData.imagen.trim(),
    descripcion_olor: perfumeData.descripcion_olor.trim(),
    categoria_perfume: perfumeData.categoria_perfume || 'diseñador',
    genero_perfume: perfumeData.genero_perfume || 'unisex',
    duracion: perfumeData.duracion.trim(),
    ml_botella_completa: Number(perfumeData.ml_botella_completa) || 0,
    precio_liverpool: Number(perfumeData.precio_liverpool) || 0,
    notas_salida: perfumeData.notas_salida.trim(),
    notas_corazon: perfumeData.notas_corazon.trim(),
    notas_fondo: perfumeData.notas_fondo.trim(),
    activo: true,
    created_at: now,
    updated_at: now,
  };

  return addDoc(perfumesCollection, newPerfume);
}

export async function updatePerfume(perfumeId, perfumeData) {
  const perfumeRef = doc(db, 'perfumes', perfumeId);

  return updateDoc(perfumeRef, {
    nombre: perfumeData.nombre.trim(),
    marca: perfumeData.marca.trim(),
    imagen: perfumeData.imagen.trim(),
    descripcion_olor: perfumeData.descripcion_olor.trim(),
    categoria_perfume: perfumeData.categoria_perfume || 'diseñador',
    genero_perfume: perfumeData.genero_perfume || 'unisex',
    duracion: perfumeData.duracion.trim(),
    ml_botella_completa: Number(perfumeData.ml_botella_completa) || 0,
    precio_liverpool: Number(perfumeData.precio_liverpool) || 0,
    notas_salida: perfumeData.notas_salida.trim(),
    notas_corazon: perfumeData.notas_corazon.trim(),
    notas_fondo: perfumeData.notas_fondo.trim(),
    updated_at: serverTimestamp(),
  });
}

export async function deactivatePerfume(perfumeId) {
  return updateDoc(doc(db, 'perfumes', perfumeId), {
    activo: false,
    updated_at: serverTimestamp(),
  });
}

export async function restorePerfume(perfumeId) {
  return updateDoc(doc(db, 'perfumes', perfumeId), {
    activo: true,
    updated_at: serverTimestamp(),
  });
}
