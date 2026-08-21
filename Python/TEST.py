import math
import tkinter as tk
from tkinter import simpledialog, messagebox
import matplotlib.pyplot as plt
import numpy as np

def crea_cerchio():
    # Finestra root nascosta necessaria per i dialoghi tkinter
    root = tk.Tk()
    root.withdraw()

    # 1. Richiesta del raggio tramite finestra grafica
    raggio_str = simpledialog.askstring(
        title="Creazione Cerchio",
        prompt="🎨 Inserisci il raggio del cerchio:",
        parent=root
    )

    # Controllo se l'utente ha premuto Annulla
    if raggio_str is None:
        messagebox.showinfo("Annullato", "Operazione annullata dall'utente.")
        root.destroy()
        return

    # Validazione del valore inserito
    try:
        raggio = float(raggio_str)
        if raggio <= 0:
            messagebox.showerror("Errore", "Il raggio deve essere un numero positivo!")
            root.destroy()
            return
    except ValueError:
        messagebox.showerror("Errore", "Valore non valido! Inserisci un numero.")
        root.destroy()
        return

    root.destroy()

    # 2. Calcoli matematici
    area = math.pi * (raggio ** 2)
    circonferenza = 2 * math.pi * raggio

    # 3. Disegno con matplotlib
    theta = np.linspace(0, 2 * np.pi, 1000)
    x = raggio * np.cos(theta)
    y = raggio * np.sin(theta)

    fig, ax = plt.subplots(figsize=(7, 7))
    fig.patch.set_facecolor("#121212")
    ax.set_facecolor("#1a1a2e")

    # Riempimento e bordo del cerchio
    ax.fill(x, y, color="#1b5e20", alpha=0.7, label="Cerchio")
    ax.plot(x, y, color="#00e676", linewidth=2.5)

    # Linea del raggio
    ax.plot([0, raggio], [0, 0], color="#ff4081", linewidth=2, linestyle="--", label=f"Raggio = {raggio}")
    ax.plot(0, 0, "o", color="white", markersize=5)  # centro

    # Annotazione al centro
    ax.text(0, 0, f"R = {raggio}", color="white", fontsize=13,
            ha="center", va="center", fontweight="bold")

    # Stile assi
    ax.set_xlim(-raggio * 1.3, raggio * 1.3)
    ax.set_ylim(-raggio * 1.3, raggio * 1.3)
    ax.set_aspect("equal")
    ax.axhline(0, color="gray", linewidth=0.5, linestyle=":")
    ax.axvline(0, color="gray", linewidth=0.5, linestyle=":")
    ax.tick_params(colors="gray")
    for spine in ax.spines.values():
        spine.set_edgecolor("#333333")

    # Titolo e legenda
    ax.set_title(f"Cerchio  |  Area: {area:.2f}  |  Circonferenza: {circonferenza:.2f}",
                 color="white", fontsize=11, pad=15)
    legend = ax.legend(facecolor="#1a1a2e", edgecolor="#333333", labelcolor="white", fontsize=10)

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    crea_cerchio()
