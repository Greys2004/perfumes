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

const clientsCollection = collection(db, 'clientes');

export function listenClients(onClientsChange, onError) {
  const clientsQuery = query(clientsCollection, orderBy('created_at', 'desc'));

  return onSnapshot(
    clientsQuery,
    (snapshot) => {
      const clients = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).filter((client) => client.activo !== false);

      onClientsChange(clients);
    },
    onError
  );
}

export async function createClient(clientData) {
  const newClient = {
    nombre: clientData.nombre.trim(),
    telefono: clientData.telefono.trim(),
    email: clientData.email.trim(),
    notas: clientData.notas.trim(),
    created_at: serverTimestamp(),
  };

  return addDoc(clientsCollection, newClient);
}

export async function updateClient(clientId, clientData) {
  return updateDoc(doc(db, 'clientes', clientId), {
    nombre: clientData.nombre.trim(),
    telefono: clientData.telefono.trim(),
    email: clientData.email.trim(),
    notas: clientData.notas.trim(),
    updated_at: serverTimestamp(),
  });
}

export async function deactivateClient(clientId) {
  return updateDoc(doc(db, 'clientes', clientId), {
    activo: false,
    updated_at: serverTimestamp(),
  });
}
