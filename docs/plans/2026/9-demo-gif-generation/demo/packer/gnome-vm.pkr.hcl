packer {
  required_plugins {
    qemu = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

variable "ubuntu_iso_url" {
  type    = string
  default = "https://releases.ubuntu.com/24.04/ubuntu-24.04.3-live-server-amd64.iso"
}

variable "ubuntu_iso_checksum" {
  type    = string
  default = "sha256:c3514bf0056180d09376462a7a1b4f213c1d6e8ea67fae5c25099c6fd3d8274b"
}

variable "vm_name" {
  type    = string
  default = "sutto-demo"
}

variable "disk_size" {
  type    = string
  default = "20G"
}

variable "memory" {
  type    = number
  default = 4096
}

variable "cpus" {
  type    = number
  default = 2
}

variable "ssh_username" {
  type    = string
  default = "demo"
}

variable "ssh_password" {
  type    = string
  default = "demo"
}

source "qemu" "gnome-vm" {
  iso_url          = var.ubuntu_iso_url
  iso_checksum     = var.ubuntu_iso_checksum
  output_directory = "output-${var.vm_name}"
  shutdown_command = "echo '${var.ssh_password}' | sudo -S shutdown -P now"
  disk_size        = var.disk_size
  format           = "qcow2"
  accelerator      = "kvm"
  memory           = var.memory
  cpus             = var.cpus
  net_device       = "virtio-net"
  disk_interface   = "virtio"
  http_directory   = "."
  ssh_username     = var.ssh_username
  ssh_password     = var.ssh_password
  ssh_timeout      = "60m"
  vm_name          = "${var.vm_name}.qcow2"
  headless         = true

  vga = "none"

  qemuargs = [
    ["-device", "qxl-vga,max_outputs=2,vram_size_mb=64"],
    ["-spice", "port=5900,disable-ticketing=on"]
  ]

  boot_command = [
    "c<wait>",
    "linux /casper/vmlinuz --- autoinstall ds='nocloud-net;s=http://{{ .HTTPIP }}:{{ .HTTPPort }}/'<enter><wait>",
    "initrd /casper/initrd<enter><wait>",
    "boot<enter>"
  ]

  boot_wait = "5s"
}

build {
  sources = ["source.qemu.gnome-vm"]

  # Phase 1: Install GNOME and reboot
  provisioner "shell" {
    script = "provision-1-gnome.sh"
    execute_command = "echo '${var.ssh_password}' | sudo -S sh -c '{{ .Vars }} {{ .Path }}'"
    expect_disconnect = true
  }

  # Wait for reboot to complete
  provisioner "shell" {
    inline = ["echo 'System rebooted successfully'"]
    pause_before = "60s"
  }

  # Phase 2: Configure system
  provisioner "shell" {
    script = "provision-2-config.sh"
    execute_command = "echo '${var.ssh_password}' | sudo -S sh -c '{{ .Vars }} {{ .Path }}'"
  }

  provisioner "file" {
    source      = "../guest/"
    destination = "/home/${var.ssh_username}/demo/"
  }
}
