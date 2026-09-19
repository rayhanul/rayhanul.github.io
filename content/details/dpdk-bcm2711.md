### DPDK Support for Raspberry Pi 4 / BCM2711

**Open-Source Systems Contribution**

Developed a patch for **DPDK 25.03** to enable PCIe Ethernet operation on the Raspberry Pi 4 / Compute Module 4 (BCM2711) using `uio_pci_generic`.

I investigated a failure where DPDK could initialize an Intel I210 NIC but could not successfully transmit packets or access received packet data. The investigation identified two platform-specific issues:

* **PCIe DMA address translation:** BCM2711 exposes device DMA addresses with an offset relative to CPU physical addresses. I added device-tree-based detection of the PCIe DMA translation and applied the corresponding IOVA adjustment.
* **Non-coherent PCIe DMA:** The PCIe bus is not cache coherent on the tested platform. I added ARM64 cache-maintenance handling to the Intel `igb` PMD, along with descriptor-management changes required for correct TX/RX operation.

With these changes, **DPDK is now working successfully on the tested Raspberry Pi Compute Module 4 system with the Intel I210 PCIe NIC.**

**Technologies:** DPDK, C, Linux, ARM64, PCIe, DMA, Device Tree, Intel I210, Raspberry Pi CM4

**Repository:** [rayhanul/dpdk-25.03](https://github.com/rayhanul/dpdk-25.03)

**Branch:** [bcm2711-dma-fix-v25.03](https://github.com/rayhanul/dpdk-25.03/tree/bcm2711-dma-fix-v25.03)

*Status: Under review for merge as a patch to DPDK. Also published in a personal DPDK fork; not yet merged upstream.*
