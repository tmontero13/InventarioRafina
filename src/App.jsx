import React, { useState, useEffect } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebaseConfig";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import "./styles.css";
import Swal from 'sweetalert2';
import { database, ref, onValue, push, set } from "./firebaseConfig";
import { remove } from "firebase/database";

const categorias = ["Vestidos", "Pantalones", "Tops", "Polleras", "Tapados", "Abrigos", "Chaquetas", "Complementos"];
const coloresVestido = ["Negro", "Blanco", "Rojo", "Azul Marino", "Beige", "Champán", "Verde Esmeralda", "Rosa Palo", "Burdeo", "Dorado", "Plateado", "Gris", "Lavanda", "Celeste", "Nude"];
const tallas = ["Talla Única", "XS", "S", "M", "L", "XL", "XXL", "32", "34", "36", "38", "40", "42", "44"];
const telas = ["Seda", "Satén", "Encaje", "Tul", "Gasa", "Crepé", "Lino", "Poliéster", "Algodón", "Terciopelo"];

function InventarioApp() {
  const [modo, setModo] = useState("");
  const [form, setForm] = useState({
    categoria: "",
    nombre: "",
    color: "",
    tela: "",
    talla: "",
    precio: "",
    costo: "",
    unidades: "",
    estado: "Disponible",
    foto: null,
  });
  const [productos, setProductos] = useState([]);
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [toast, setToast] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 20;

  useEffect(() => {
    const productosRef = ref(database, "productos");
    const unsubscribe = onValue(productosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productosArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
        }));
        setProductos(productosArray);
      } else {
        setProductos([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm({ ...form, [name]: files ? files[0] : value });
  };

  const sanitizeFileName = (name) => {
    return name.replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let url = "";

    if (form.foto && typeof form.foto !== "string") {
      try {
        const nombreSeguro = sanitizeFileName(form.foto.name);
        const fileRef = storageRef(storage, `fotos/${nombreSeguro}`);
        await uploadBytes(fileRef, form.foto);
        url = await getDownloadURL(fileRef);
      } catch (error) {
        console.error("Error al subir imagen:", error);
      }
    }

    try {
      const productosRef = ref(database, "productos");
      const nuevoProductoRef = push(productosRef);
      const productoId = nuevoProductoRef.key;
      const nuevoProducto = { id: productoId, ...form, imagenURL: url };
      await set(nuevoProductoRef, nuevoProducto);
    } catch (error) {
      console.error("Error al guardar en Firebase:", error);
    }

    Swal.fire({ icon: 'success', title: '¡Producto guardado!', showConfirmButton: false, timer: 1500 });
    setForm({ categoria: "", nombre: "", color: "", tela: "", talla: "", precio: "", costo: "", unidades: "", estado: "Disponible", foto: null });
    setModo("");
  };

  const handleEditar = (index) => {
    const producto = productos[index];
    setForm(producto);
    setEditandoIndex(index);
    setModo("nuevo");
  };

  const handleEliminar = (index) => {
    const producto = productos[index];
    Swal.fire({
      title: '¿Estás seguro?',
      text: "¡No podrás revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const productoRef = ref(database, `productos/${producto.id}`);
        remove(productoRef)
          .then(() => {
            Swal.fire('¡Eliminado!', 'El producto ha sido eliminado correctamente.', 'success');
          })
          .catch((error) => {
            console.error("Error al eliminar producto:", error);
            Swal.fire('Error', 'No se pudo eliminar el producto.', 'error');
          });
      }
    });
  };

  const exportarExcel = () => {
    const dataConTotales = [...productos];
    const totalUnidades = productos.reduce((acc, p) => acc + Number(p.unidades || 0), 0);
    const valorTotal = productos.reduce((acc, p) => acc + Number(p.unidades || 0) * Number(p.precio || 0), 0);
    dataConTotales.push({});
    dataConTotales.push({ nombre: "TOTALES", unidades: totalUnidades, precio: valorTotal });
    const ws = XLSX.utils.json_to_sheet(dataConTotales);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "inventario.xlsx");
  };

  const formatearPrecio = (valor) => {
    if (!valor) return "";
    return "$" + Number(valor).toLocaleString("es-CL");
  };

  const productosFiltrados = productos.filter((producto) => {
    const coincideBusqueda = producto.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro === "Todas" || producto.categoria === categoriaFiltro;
    return coincideBusqueda && coincideCategoria;
  });

  const indiceUltimoProducto = paginaActual * productosPorPagina;
  const indicePrimerProducto = indiceUltimoProducto - productosPorPagina;
  const productosPaginados = productosFiltrados.slice(indicePrimerProducto, indiceUltimoProducto);

  return (
    <div className="container">
      {toast && <div className="toast">{toast}</div>}
      {!modo && (
        <div style={{ textAlign: "center" }}>
          <h1>Gestión de Inventario</h1>
          <button onClick={() => setModo("nuevo")} className="boton-menu">➕ Nuevo Producto</button>
          <button onClick={() => setModo("inventario")} className="boton-menu">📋 Ver Inventario</button>
        </div>
      )}
      {modo === "nuevo" && (
        <form onSubmit={handleSubmit} className="formulario">
          <select name="categoria" value={form.categoria} onChange={handleChange} className="input" required>
            <option value="">Seleccionar Categoría</option>
            {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input type="text" name="nombre" placeholder="Nombre del producto" value={form.nombre} onChange={handleChange} className="input" required />
          <select name="color" value={form.color} onChange={handleChange} className="input" required>
            <option value="">Seleccionar Color</option>
            {coloresVestido.map((color) => <option key={color} value={color}>{color}</option>)}
          </select>
          <select name="tela" value={form.tela} onChange={handleChange} className="input" required>
            <option value="">Seleccionar Tela</option>
            {telas.map((tela) => <option key={tela} value={tela}>{tela}</option>)}
          </select>
          <select name="talla" value={form.talla} onChange={handleChange} className="input" required>
            <option value="">Seleccionar Talla</option>
            {tallas.map((talla) => <option key={talla} value={talla}>{talla}</option>)}
          </select>
          <input type="number" name="precio" placeholder="Precio de venta" value={form.precio} onChange={handleChange} className="input" />
          <input type="number" name="costo" placeholder="Costo" value={form.costo} onChange={handleChange} className="input" />
          <select name="unidades" value={form.unidades} onChange={handleChange} className="input" required>
            <option value="">Seleccionar Cantidad</option>
            {[...Array(20)].map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
          <input type="file" name="foto" onChange={handleChange} className="input" />
          <select name="estado" value={form.estado} onChange={handleChange} className="input" required>
            <option value="Disponible">Disponible</option>
            <option value="No disponible">No disponible</option>
          </select>
          <button type="submit" className="boton-formulario">Guardar Producto</button>
          <button type="button" onClick={() => setModo("")} className="boton-formulario">⬅️ Volver al Menú</button>
        </form>
      )}
      {modo === "inventario" && (
        <div>
          <h2 style={{ textAlign: "center" }}>Inventario Actual</h2>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <button onClick={exportarExcel} className="boton-accion">📤 Exportar a Excel</button>
            <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="input-inventario" />
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="input-inventario">
              <option value="Todas">Todas las categorías</option>
              {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <p style={{ textAlign: "center", fontWeight: "bold", marginTop: "1rem" }}>
            Total de unidades: {productosFiltrados.reduce((acc, p) => acc + Number(p.unidades || 0), 0)}
          </p>
          <p style={{ textAlign: "center", fontWeight: "bold", marginTop: "1rem" }}>
            Valor total estimado: {formatearPrecio(productosFiltrados.reduce((acc, p) => acc + (Number(p.unidades || 0) * Number(p.precio || 0)), 0))}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Color</th>
                  <th>Talla</th>
                  <th>Precio</th>
                  <th>Unidades</th>
                  <th>Imagen</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosPaginados.map((p, idx) => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td>{p.color}</td>
                    <td>{p.talla}</td>
                    <td>{formatearPrecio(p.precio)}</td>
                    <td>{p.unidades}</td>
                    <td>{p.imagenURL && (
                      <img src={p.imagenURL} alt="Producto" style={{ width: "50px", height: "50px", objectFit: "cover" }} />
                    )}</td>
                    <td>
                      <button onClick={() => handleEditar(idx)} className="boton-accion" style={{ marginRight: "0.5rem" }}>✏️</button>
                      <button onClick={() => handleEliminar(idx)} className="boton-accion">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            {Array.from({ length: Math.ceil(productosFiltrados.length / productosPorPagina) }, (_, i) => (
              <button key={i} onClick={() => setPaginaActual(i + 1)} style={{
                margin: "0 0.25rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: paginaActual === (i + 1) ? "2px solid #a3a3a3" : "1px solid #ccc",
                backgroundColor: paginaActual === (i + 1) ? "#d4d4d4" : "#e0e0e0",
                cursor: "pointer",
                fontWeight: "bold"
              }}>{i + 1}</button>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button onClick={() => setModo("")} className="boton-accion">⬅️ Volver</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventarioApp;

