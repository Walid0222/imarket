import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from '../Firebase'; // Importer Firestore
import Swal from 'sweetalert2'; // Importer SweetAlert
import './OrdersPage.css';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null); // Pour gérer l'état de l'ordre actif

    const username = localStorage.getItem('username'); // Récupérer l'utilisateur connecté

    const fetchOrders = async () => {
        try {
            const q = query(collection(db, "formSubmissions"), orderBy("id", "desc"));
            const querySnapshot = await getDocs(q);
            const ordersList = querySnapshot.docs.map(doc => ({
                docId: doc.id,
                ...doc.data()
            }));
            setOrders(ordersList);
            setLoading(false);
        } catch (error) {
            console.error("Erreur lors de la récupération des commandes: ", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Fonction pour afficher les détails de la commande
    const toggleDetails = (orderId) => {
        setExpandedOrder(prevOrder => (prevOrder === orderId ? null : orderId));
    };

    // Fonction pour confirmer une commande
    const handleConfirmOrder = async (docId) => {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Vous êtes sur le point de confirmer cette commande. Cette action est irréversible.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Oui, confirmer',
            cancelButtonText: 'Annuler'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const orderRef = doc(db, "formSubmissions", docId);
                    await updateDoc(orderRef, {
                        status: 'confirmed',
                        confirmedBy: username // Ajouter qui a confirmé
                    });

                    Swal.fire({
                        title: 'Succès!',
                        text: `La commande a été confirmée par : ${username}.`,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    });

                    fetchOrders(); // Rafraîchir les commandes après confirmation
                } catch (error) {
                    console.error("Erreur lors de la mise à jour du statut: ", error);

                    Swal.fire({
                        title: 'Erreur!',
                        text: `Une erreur est survenue lors de la confirmation de la commande : ${error.message}`,
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                }
            }
        });
    };

    // Fonction pour créer le ramassage avec confirmation
    const handlePickupCreation = async (docId) => {
        Swal.fire({
            title: 'Créer le ramassage?',
            text: "Voulez-vous vraiment créer le ramassage pour cette commande?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui, créer',
            cancelButtonText: 'Non, annuler',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Mettre à jour la commande pour ajouter l'information du ramassage dans Firestore
                    const orderRef = doc(db, "formSubmissions", docId);
                    await updateDoc(orderRef, {
                        pickupCreatedBy: username, // Ajouter qui a créé le ramassage
                        pickupStatus: 'created' // Ajouter un statut pour le ramassage
                    });

                    // Afficher un message de confirmation
                    Swal.fire({
                        title: 'Ramassage créé!',
                        text: `Le ramassage a été créé par : ${username}.`,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    });

                    // Rafraîchir les commandes après la création du ramassage
                    fetchOrders();
                } catch (error) {
                    console.error("Erreur lors de la création du ramassage: ", error);

                    Swal.fire({
                        title: 'Erreur!',
                        text: `Une erreur est survenue lors de la création du ramassage : ${error.message}`,
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                }
            }
        });
    };

    // Fonction pour annuler une commande avec une raison
    const handleCancelOrder = async (docId) => {
        Swal.fire({
            title: 'Êtes-vous sûr d\'annuler cette commande?',
            input: 'textarea',
            inputLabel: 'Raison de l\'annulation (facultatif)',
            inputPlaceholder: 'Écrivez ici la raison...',
            showCancelButton: true,
            confirmButtonText: 'Annuler la commande',
            cancelButtonText: 'Retour'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const cancelReason = result.value || '';
                try {
                    const orderRef = doc(db, "formSubmissions", docId);
                    await updateDoc(orderRef, {
                        status: 'cancelled',
                        cancelledBy: username, // Ajouter qui a annulé
                        cancelReason: cancelReason
                    });

                    Swal.fire({
                        title: 'Commande annulée!',
                        text: `Annulée par : ${username} ${cancelReason ? '\nRaison: ' + cancelReason : ''}`,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    });

                    fetchOrders(); // Rafraîchir les commandes
                } catch (error) {
                    console.error("Erreur lors de l'annulation: ", error);
                }
            }
        });
    };

    // Fonction pour afficher la raison d'annulation
    const showCancelReason = (cancelReason, cancelledBy) => {
        Swal.fire({
            title: 'Raison de l\'annulation',
            text: `${cancelReason ? cancelReason : 'Aucune raison fournie'}\n Annulée par: ${cancelledBy}`,
            icon: 'info',
            confirmButtonText: 'OK'
        });
    };

    if (loading) {
        return <div>Chargement des commandes...</div>;
    }

    return (
        <div className="orders-page">
            <h1></h1>
            {orders.length === 0 ? (
                <p>Aucune commande trouvée.</p>
            ) : (
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nom</th>
                            
                            <th>Heure d'achat</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <React.Fragment key={order.docId}>
                                <tr onClick={() => toggleDetails(order.docId)} className="main-row">
                                    <td>{order.id}</td>
                                    <td>{order.name}</td>
                                    
                                    <td>{order.time}</td>
                                    <td className={order.status === 'confirmed' ? 'status-green' : order.status === 'cancelled' ? 'status-red' : 'status-pending'}>
                                        {order.status === 'confirmed' ? `Confirmée par ${order.confirmedBy}` : order.status === 'cancelled' ? `Annulée par ${order.cancelledBy}` : 'En attente'}
                                    </td>
                                </tr>

                                {expandedOrder === order.docId && (
                                    <tr className="details-row">
                                        <td colSpan="7">
                                            <div className="details">
                                                <p><strong>ID :</strong> {order.id} </p>
                                                <p><strong>Date d'achat :</strong> {order.date} </p>
                                                <p><strong>Heure d'achat :</strong> {order.time}</p>
                                                <p><strong>Téléphone :</strong> {order.phone}</p>
                                                <p><strong>Adresse :</strong> {order.address}</p>
                                                <p><strong>Ville :</strong> {order.city}</p>
                                                <p><strong>Produit :</strong> {order.productTitle}</p>
                                                <p><strong>Quantité :</strong> {order.quantity}</p>
                                                <p><strong>Prix :</strong> {order.price} درهم</p>

                                                <div className="details-actions">
                                                    {order.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => handleConfirmOrder(order.docId)} className="button-confirm">
                                                                Confirmer
                                                            </button>
                                                            <button onClick={() => handleCancelOrder(order.docId)} className="button-cancel">
                                                                ❌ Annuler
                                                            </button>
                                                        </>
                                                    )}
                                                    {order.status === 'cancelled' && (
                                                        <button onClick={() => showCancelReason(order.cancelReason, order.cancelledBy)} className="button-info">
                                                            ℹ️ Voir la raison de l'annulation
                                                        </button>
                                                    )}
                                                    {order.status === 'confirmed' && (
                                                        <>
                                                            <p className="status-confirmed">Cette commande a été confirmée par {order.confirmedBy}.</p>
                                                            {order.pickupStatus !== 'created' ? (
                                                                <button onClick={() => handlePickupCreation(order.docId)} className="button-pickup">
                                                                    Créer Ramassage
                                                                </button>
                                                            ) : (
                                                                <p className="status-pickup">Ramassage créé par {order.pickupCreatedBy}</p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default OrdersPage;